const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const User = require('../models/User');
const KnowledgeSource = require('../models/KnowledgeSource');

const router = express.Router();

const baseUrl = process.env.PAICHAT_API_BASE || '';
const tenantId = process.env.PAICHAT_TENANT_ID || '';
const platformKey = process.env.PAICHAT_PLATFORM_KEY || '';
const consoleToken = process.env.PAICHAT_CONSOLE_TOKEN || '';

const normalizeBase = (value) => String(value || '').replace(/\/$/, '');

const normalizeExternalUrl = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return '';
  return `https://${trimmed}`;
};

const parseUrlList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => parseUrlList(entry))
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const extractTitle = (html) => {
  if (!html) return '';
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  if (!match) return '';
  return match[1].replace(/\s+/g, ' ').trim();
};

const extractText = (html) => {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const clampText = (text, limit = 8000) => {
  if (!text) return '';
  return text.length > limit ? text.slice(0, limit) : text;
};

const buildKnowledgePayload = async ({ url, title, content, sourceUrl }) => {
  const normalizedUrl = normalizeExternalUrl(url || sourceUrl);
  let finalSourceUrl = typeof sourceUrl === 'string' ? sourceUrl.trim() : '';
  if (!finalSourceUrl && normalizedUrl) {
    finalSourceUrl = normalizedUrl;
  }

  let finalTitle = typeof title === 'string' ? title.trim() : '';
  const notes = typeof content === 'string' ? content.trim() : '';

  let fetchedText = '';
  let fetchError = '';

  if (normalizedUrl) {
    try {
      const response = await axios.get(normalizedUrl, {
        timeout: 8000,
        headers: { 'User-Agent': 'JobPostBot/1.0' }
      });
      const html = typeof response.data === 'string' ? response.data : '';
      fetchedText = extractText(html);
      if (!finalTitle) {
        finalTitle =
          extractTitle(html) || normalizedUrl.replace(/^https?:\/\//i, '').split('/')[0];
      }
    } catch (error) {
      fetchError = 'Unable to fetch the website content.';
    }
  }

  if (!finalTitle) {
    finalTitle = finalSourceUrl || 'Website knowledge';
  }

  let finalContent = fetchedText || '';
  if (notes) {
    finalContent = finalContent
      ? `${finalContent}\n\nNotes:\n${notes}`
      : notes;
  }
  finalContent = clampText(finalContent);

  if (!finalContent) {
    return {
      error: fetchError || 'Knowledge content is required.',
      title: finalTitle,
      sourceUrl: finalSourceUrl || normalizedUrl,
      contentLength: 0
    };
  }

  return {
    title: finalTitle,
    sourceUrl: finalSourceUrl || normalizedUrl,
    content: finalContent,
    contentLength: finalContent.length
  };
};

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
      externalUserId: user.email || String(req.userId)
    };

    const response = await axios.post(
      `${normalizeBase(baseUrl)}/v1/tenants/${tenantId}/users/token`,
      payload,
      {
        headers: { 'x-platform-key': platformKey },
        timeout: 6000
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

router.get('/knowledge', auth, requireRole('admin'), async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    KnowledgeSource.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    KnowledgeSource.countDocuments()
  ]);

  return res.json({ items, total, page, limit });
});

router.post('/knowledge', auth, requireRole('admin'), async (req, res) => {
  if (!baseUrl || !consoleToken) {
    return res.status(501).json({ message: 'PAIchat knowledge is not configured.' });
  }

  const { url, title, content, sourceUrl, urls } = req.body || {};
  const urlList = [...parseUrlList(urls), ...parseUrlList(url || sourceUrl)];

  if (!urlList.length && !content) {
    return res.status(400).json({ message: 'Please provide at least one website link.' });
  }

  const entries = urlList.length
    ? urlList.map((entryUrl) => ({ url: entryUrl, title, content, sourceUrl }))
    : [{ url, title, content, sourceUrl }];

  const results = [];

  for (const entry of entries) {
    const payload = await buildKnowledgePayload(entry);
    const record = {
      title: payload.title || entry.title,
      url: entry.url,
      sourceUrl: payload.sourceUrl,
      addedBy: req.userId,
      contentLength: payload.contentLength
    };

    if (payload.error) {
      const message = payload.error;
      const saved = await KnowledgeSource.create({
        ...record,
        status: 'failed',
        errorMessage: message
      });
      results.push({
        id: saved._id,
        status: 'failed',
        title: saved.title,
        sourceUrl: saved.sourceUrl,
        error: message
      });
      continue;
    }

    try {
      const response = await axios.post(
        `${normalizeBase(baseUrl)}/v1/console/knowledge`,
        {
          title: payload.title,
          content: payload.content,
          sourceUrl: payload.sourceUrl || undefined
        },
        {
          headers: { Authorization: `Bearer ${consoleToken}` },
          timeout: 8000
        }
      );

      const externalId = response.data?.id || response.data?._id || response.data?.knowledgeId;

      const saved = await KnowledgeSource.create({
        ...record,
        status: 'success',
        externalId
      });

      results.push({
        id: saved._id,
        status: 'success',
        title: saved.title,
        sourceUrl: saved.sourceUrl,
        externalId
      });
    } catch (err) {
      const status = err?.response?.status || 502;
      const message = err?.response?.data?.error || err?.message || 'PAIchat knowledge request failed.';
      const saved = await KnowledgeSource.create({
        ...record,
        status: 'failed',
        errorMessage: message
      });
      results.push({
        id: saved._id,
        status: 'failed',
        title: saved.title,
        sourceUrl: saved.sourceUrl,
        error: message,
        statusCode: status
      });
    }
  }

  const successCount = results.filter((entry) => entry.status === 'success').length;
  const failureCount = results.length - successCount;

  return res.json({ results, successCount, failureCount });
});

router.get('/suggestions', auth, async (req, res) => {
  const user = await User.findById(req.userId)
    .select('location desiredRoles skills headline')
    .lean();

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const filters = {};
  const reasons = [];

  const desiredRole = Array.isArray(user.desiredRoles) ? user.desiredRoles[0] : null;
  const primarySkill = Array.isArray(user.skills) ? user.skills[0] : null;
  const secondarySkill = Array.isArray(user.skills) ? user.skills[1] : null;

  if (desiredRole) {
    filters.title = desiredRole;
    reasons.push(`Role: ${desiredRole}`);
  } else if (user.headline) {
    filters.title = user.headline;
    reasons.push('Based on your headline');
  } else if (primarySkill) {
    const skillLabel = secondarySkill ? `${primarySkill}, ${secondarySkill}` : primarySkill;
    filters.title = primarySkill;
    reasons.push(`Skills: ${skillLabel}`);
  }

  if (user.location) {
    filters.location = user.location;
    reasons.push(`Location: ${user.location}`);
  }

  return res.json({ filters, reasons });
});

module.exports = router;
