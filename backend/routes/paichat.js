const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const baseUrl = process.env.PAICHAT_API_BASE || '';
const tenantId = process.env.PAICHAT_TENANT_ID || '';
const platformKey = process.env.PAICHAT_PLATFORM_KEY || '';

const normalizeBase = (value) => String(value || '').replace(/\/$/, '');

router.get('/token', auth, async (req, res) => {
  if (!baseUrl || !tenantId || !platformKey) {
    return res.status(501).json({ message: 'PAIchat is not configured.' });
  }

  const user = await User.findById(req.userId).select('email name').lean();
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  try {
    const payload = {
      externalUserId: user.email || String(req.userId),
    };

    const response = await axios.post(
      `${normalizeBase(baseUrl)}/v1/tenants/${tenantId}/users/token`,
      payload,
      {
        headers: { 'x-platform-key': platformKey },
        timeout: 6000,
      }
    );

    const token = response.data?.token;
    if (!token) {
      return res.status(502).json({ message: 'PAIchat token response missing token.' });
    }

    return res.json({ token });
  } catch (err) {
    const status = err?.response?.status || 502;
    const message = err?.response?.data?.error || err?.message || 'PAIchat token request failed.';
    return res.status(status).json({ message });
  }
});

module.exports = router;