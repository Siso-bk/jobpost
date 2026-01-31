const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const axios = require('axios');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { authCookieOptions, clearAuthCookieOptions } = require('../utils/cookies');

const PAI_API_BASE = (process.env.PAI_API_BASE || '').replace(/\/$/, '');
const PAI_TENANT_ID = (process.env.PAI_TENANT_ID || '').trim();
const PAI_PLATFORM = (process.env.PAI_PLATFORM || '').trim();
const PAI_TIMEOUT_MS = 10000;
const VALID_ROLES = ['worker', 'employer'];

function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return [];
  return Array.from(new Set(roles.map((role) => String(role || '').trim()).filter(Boolean)));
}

function signAuthToken(user) {
  return jwt.sign(
    { id: user._id, roles: normalizeRoles(user.roles) },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    roles: normalizeRoles(user.roles)
  };
}

function buildPaiUrl(path) {
  if (!PAI_API_BASE) return '';
  if (!path.startsWith('/')) return `${PAI_API_BASE}/${path}`;
  return `${PAI_API_BASE}${path}`;
}

async function postToPai(path, payload) {
  if (!PAI_API_BASE) {
    const error = new Error('PAI_API_BASE is not configured');
    error.status = 500;
    throw error;
  }
  const headers = {};
  if (PAI_TENANT_ID) headers['x-tenant-id'] = PAI_TENANT_ID;
  if (PAI_PLATFORM) headers['x-platform'] = PAI_PLATFORM;
  return axios.post(buildPaiUrl(path), payload, { timeout: PAI_TIMEOUT_MS, headers });
}

async function upsertPaiUser(paiUser, role) {
  const email = (paiUser?.email || '').toLowerCase();
  if (!email) {
    const error = new Error('PAI user missing email');
    error.code = 'pai_user_missing_email';
    throw error;
  }

  let user = await User.findOne({ provider: 'personalai', providerId: paiUser.id });
  if (!user) {
    user = await User.findOne({ email });
  }

  if (!user) {
    if (!role) {
      const error = new Error('JobPost role is required to create a profile');
      error.code = 'role_required';
      throw error;
    }
    const tempPassword = crypto.randomBytes(24).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    user = new User({
      name: paiUser?.name || 'User',
      email,
      password: hashedPassword,
      roles: [role],
      provider: 'personalai',
      providerId: paiUser.id,
      isVerified: true
    });
    await user.save();
    return user;
  }

  const updates = {};
  if (!user.provider) updates.provider = 'personalai';
  if (!user.providerId) updates.providerId = paiUser.id;
  if (paiUser?.name && user.name !== paiUser.name) updates.name = paiUser.name;
  if (!user.isVerified) updates.isVerified = true;
  const currentRoles = normalizeRoles(user.roles);
  const desiredRoles = new Set(currentRoles);
  if (role) desiredRoles.add(role);
  if (desiredRoles.size !== currentRoles.length) {
    updates.roles = Array.from(desiredRoles);
  }
  if (Object.keys(updates).length) {
    user = await User.findByIdAndUpdate(user._id, updates, { new: true });
  }
  return user;
}



// Logout (clear auth cookie)
router.post('/logout', (req, res) => {
  res.clearCookie('token', clearAuthCookieOptions());
  return res.json({ message: 'Logged out' });
});

// Return current user based on session cookie
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('_id name email roles');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(publicUser(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Local signup is disabled (PAI-only)
router.post('/register', (_req, res) => {
  return res.status(403).json({
    message: 'PersonalAI authentication is required.',
    code: 'pai_required'
  });
});

// Local login is disabled (PAI-only)
router.post('/login', (_req, res) => {
  return res.status(403).json({
    message: 'PersonalAI authentication is required.',
    code: 'pai_required'
  });
});

// PAI signup: request verification code
router.post('/pai-signup', async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase();
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    const paiRes = await postToPai('/api/auth/pai-signup', { email });
    return res.status(paiRes.status).json(paiRes.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(error.status || 502).json({ message: error.message || 'PAI signup failed' });
  }
});

// PAI signup: verify 6-digit code
router.post('/pai-signup/verify', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    const paiRes = await postToPai('/api/auth/pai-signup/verify', { email, code });
    return res.status(paiRes.status).json(paiRes.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(error.status || 502).json({ message: error.message || 'PAI verification failed' });
  }
});

// PAI signup: complete account and create JobPost profile
router.post('/pai-signup/complete', async (req, res) => {
  try {
    const { preToken, name, password, handle, role } = req.body || {};
    if (!role || !['worker', 'employer'].includes(role)) {
      return res.status(400).json({ message: 'Valid role is required' });
    }
    const paiRes = await postToPai('/api/auth/pai-signup/complete', {
      preToken,
      name,
      password,
      handle
    });
    const paiUser = paiRes.data?.user;
    if (!paiUser) {
      return res.status(500).json({ message: 'PAI response missing user' });
    }
    const user = await upsertPaiUser(paiUser, role);
    const token = signAuthToken(user);
    res.cookie('token', token, authCookieOptions());
    return res.status(201).json({
      message: 'Signup complete',
      user: publicUser(user)
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    if (error.code === 'role_required') {
      return res.status(409).json({ message: error.message, code: 'jobpost_profile_required' });
    }
    return res.status(error.status || 502).json({ message: error.message || 'PAI signup failed' });
  }
});

// PAI login (email + password)
router.post('/pai-login', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Valid role is required' });
    }
    const paiRes = await postToPai('/api/auth/login', { email, password });
    const paiUser = paiRes.data?.user;
    if (!paiUser) {
      return res.status(500).json({ message: 'PAI response missing user' });
    }
    let user;
    try {
      user = await upsertPaiUser(paiUser, role);
    } catch (err) {
      if (err.code === 'role_required') {
        return res.status(409).json({ message: err.message, code: 'jobpost_profile_required' });
      }
      throw err;
    }
    const token = signAuthToken(user);
    res.cookie('token', token, authCookieOptions());
    return res.json({
      message: 'Login successful',
      user: publicUser(user)
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(error.status || 502).json({ message: error.message || 'PAI login failed' });
  }
});

// PAI resend verification code
router.post('/pai-resend', async (req, res) => {
  try {
    const { email } = req.body || {};
    const paiRes = await postToPai('/api/auth/resend', { email });
    return res.status(paiRes.status).json(paiRes.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(error.status || 502).json({ message: error.message || 'PAI resend failed' });
  }
});

// PAI verify code for existing user (email not verified)
router.post('/pai-verify-code', async (req, res) => {
  try {
    const { email, code, role } = req.body || {};
    const paiRes = await postToPai('/api/auth/verify-code', { email, code });
    const paiUser = paiRes.data?.user;
    if (!paiUser) {
      return res.status(500).json({ message: 'PAI response missing user' });
    }
    const user = await upsertPaiUser(paiUser, role);
    const token = signAuthToken(user);
    res.cookie('token', token, authCookieOptions());
    return res.json({
      message: 'Email verified',
      user: publicUser(user)
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    if (error.code === 'role_required') {
      return res.status(409).json({ message: error.message, code: 'jobpost_profile_required' });
    }
    return res.status(error.status || 502).json({ message: error.message || 'PAI verify failed' });
  }
});

// External auth using PersonalAI id_token
router.post('/external', async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) return res.status(400).json({ message: 'id_token is required' });

    const issuer = process.env.PERSONALAI_ISSUER || undefined;
    const audience = process.env.PERSONALAI_AUDIENCE || undefined;
    const alg = (process.env.PERSONALAI_ID_TOKEN_ALG || 'HS256').toUpperCase();

    let decoded;
    if (alg === 'HS256') {
      const secret = process.env.PERSONALAI_CLIENT_SECRET;
      if (!secret) return res.status(500).json({ message: 'HS256 requires PERSONALAI_CLIENT_SECRET' });
      const verifyOpts = { algorithms: ['HS256'] };
      if (issuer) verifyOpts.issuer = issuer;
      if (audience) verifyOpts.audience = audience;
      decoded = jwt.verify(id_token, secret, verifyOpts);
    } else if (alg === 'RS256') {
      const jwksUri = process.env.PERSONALAI_JWKS_URI;
      if (!jwksUri) return res.status(500).json({ message: 'RS256 requires PERSONALAI_JWKS_URI' });
      const { createRemoteJWKSet, jwtVerify } = require('jose');
      const JWKS = createRemoteJWKSet(new URL(jwksUri));
      const verifyOpts = {};
      if (issuer) verifyOpts.issuer = issuer;
      if (audience) verifyOpts.audience = audience;
      const { payload } = await jwtVerify(id_token, JWKS, verifyOpts);
      decoded = payload;
    } else {
      return res.status(400).json({ message: 'Unsupported PERSONALAI_ID_TOKEN_ALG' });
    }

    const sub = decoded.sub;
    const email = decoded.email;
    const name = decoded.name || decoded.preferred_username || 'User';

    if (!sub) return res.status(400).json({ message: 'Invalid token: missing sub' });

    let user = await User.findOne({ provider: 'personalai', providerId: sub });
    if (!user && email) {
      user = await User.findOne({ email });
    }
    if (!user) {
      user = new User({
        name,
        email,
        roles: ['worker'],
        provider: 'personalai',
        providerId: sub,
        isVerified: true,
        password: '!'
      });
      await user.save();
    } else {
      if (!user.provider) user.provider = 'personalai';
      if (!user.providerId) user.providerId = sub;
      const roles = normalizeRoles(user.roles);
      if (roles.length === 0) {
        roles.push('worker');
        user.roles = roles;
      }
      await user.save();
    }

    const token = signAuthToken(user);
    res.cookie('token', token, authCookieOptions());
    return res.json({
      message: 'Login successful',
      user: publicUser(user)
    });
  } catch (error) {
    return res.status(401).json({ message: error.message || 'External auth failed' });
  }
});

module.exports = router;
