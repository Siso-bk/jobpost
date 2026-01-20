const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Logout (clear auth cookie)
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' });
  return res.json({ message: 'Logged out' });
});

module.exports = router;

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
      user = new User({ name, email, role: 'worker', provider: 'personalai', providerId: sub, isVerified: true, password: '!' });
      await user.save();
    } else {
      if (!user.provider) user.provider = 'personalai';
      if (!user.providerId) user.providerId = sub;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ message: 'Login successful', token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return res.status(401).json({ message: error.message || 'External auth failed' });
  }
});
