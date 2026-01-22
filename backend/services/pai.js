const axios = require('axios');
const User = require('../models/User');

const baseUrl = process.env.PAI_API_BASE || '';
const serviceKey = process.env.PAI_SERVICE_KEY || '';
const tenantId = process.env.PAI_TENANT_ID || '';
const platform = process.env.PAI_PLATFORM || 'jobpost';

const normalizeBase = (value) => String(value || '').replace(/\/$/, '');

async function getPaiUserId(localUserId) {
  if (!localUserId) return null;
  const user = await User.findById(localUserId).select('provider providerId').lean();
  if (!user || user.provider !== 'personalai' || !user.providerId) return null;
  return user.providerId;
}

async function logPaiEvent(localUserId, payload) {
  if (!baseUrl || !serviceKey) return;
  const paiUserId = await getPaiUserId(localUserId);
  if (!paiUserId) return;

  const headers = {
    'x-service-key': serviceKey,
    'x-user-id': paiUserId,
  };
  if (tenantId) headers['x-tenant-id'] = tenantId;
  if (platform) headers['x-platform'] = platform;

  try {
    await axios.post(`${normalizeBase(baseUrl)}/api/events`, payload, { headers, timeout: 4000 });
  } catch {
    // Best-effort logging; never block primary flows.
  }
}

module.exports = { logPaiEvent };
