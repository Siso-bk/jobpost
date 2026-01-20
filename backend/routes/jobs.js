const express = require('express');
const { Storage } = require('@google-cloud/storage');
const router = express.Router();
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

const getGcsConfig = () => {
  const bucketName = process.env.GCS_BUCKET_NAME;
  const publicBase = process.env.GCS_PUBLIC_BASE_URL || (bucketName ? `https://storage.googleapis.com/${bucketName}` : '');
  const credentialsRaw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!bucketName) {
    throw new Error('Missing GCS_BUCKET_NAME');
  }
  if (!credentialsRaw) {
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_JSON');
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsRaw);
  } catch (error) {
    throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON');
  }

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  return {
    bucketName,
    publicBase,
    storage: new Storage({
      credentials,
      projectId: process.env.GCS_PROJECT_ID || credentials.project_id,
    }),
  };
};

const extensionForType = (contentType) => {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[contentType] || contentType.split('/')[1] || 'png';
};

const uploadLogo = async (dataUrl, userId) => {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid logo data');
  }

  const contentType = match[1];
  if (!LOGO_TYPES.has(contentType)) {
    throw new Error('Unsupported logo type');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_LOGO_BYTES) {
    throw new Error('Logo must be under 1MB');
  }

  const ext = extensionForType(contentType);
  const filename = `job-logos/${userId}/${Date.now()}.${ext}`;

  const { bucketName, publicBase, storage } = getGcsConfig();
  const file = storage.bucket(bucketName).file(filename);
  await file.save(buffer, { metadata: { contentType }, resumable: false, validation: 'md5' });

  return publicBase ? `${publicBase}/${filename}` : `https://storage.googleapis.com/${bucketName}/${filename}`;
};

const normalizeLogoUrl = async (value, userId) => {
  if (value === undefined) return undefined;
  const trimmed = String(value).trim();
  if (trimmed === '') return '';
  if (trimmed.startsWith('data:image/')) {
    return uploadLogo(trimmed, userId);
  }
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed;
  }
  throw new Error('Logo must be a URL or uploaded image');
};

// Get all jobs (with pagination and filters)
router.get('/', async (req, res) => {
  try {
    const { title, location, jobType, category, minSalary, maxSalary, page = 1, limit = 20 } = req.query;
    
    let filter = { status: 'open' };

    if (title) filter.title = { $regex: title, $options: 'i' };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (jobType) filter.jobType = jobType;
    if (category) filter.category = category;

    if (minSalary || maxSalary) {
      const hasMin = minSalary !== undefined && minSalary !== null && minSalary !== '';
      const hasMax = maxSalary !== undefined && maxSalary !== null && maxSalary !== '';
      const min = hasMin ? Number(minSalary) : undefined;
      const max = hasMax ? Number(maxSalary) : undefined;

      if (min !== undefined && !Number.isNaN(min)) {
        filter['salary.min'] = { $gte: min };
      }
      if (max !== undefined && !Number.isNaN(max)) {
        filter['salary.max'] = { $lte: max };
      }
    }

    const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);

    const [items, total] = await Promise.all([
      Job.find(filter)
        .populate('employerId', 'name email company')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * lim)
        .limit(lim),
      Job.countDocuments(filter),
    ]);

    res.json({ items, page: pageNum, limit: lim, total, pages: Math.ceil(total / lim) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employer jobs
router.get('/mine', auth, requireRole('employer'), async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.userId })
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('employerId', 'name email company');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post new job (employer only)
router.post('/', auth, requireRole('employer'), async (req, res) => {
  try {
    const { title, description, company, location, salary, jobType, category, skills, experienceLevel, logoUrl } = req.body;

    if (!title || !description || !company || !location || !jobType) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    let resolvedLogoUrl;
    if (logoUrl !== undefined) {
      try {
        resolvedLogoUrl = await normalizeLogoUrl(logoUrl, req.userId);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    const job = new Job({
      title,
      description,
      company,
      location,
      salary,
      jobType,
      category,
      skills: skills || [],
      experienceLevel,
      employerId: req.userId,
      logoUrl: resolvedLogoUrl
    });

    await job.save();
    res.status(201).json({ message: 'Job posted successfully', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update job (employer only; safe fields)
router.put('/:id', auth, requireRole('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    if (req.body.logoUrl !== undefined) {
      try {
        job.logoUrl = await normalizeLogoUrl(req.body.logoUrl, req.userId);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    const allowed = ['title', 'description', 'company', 'location', 'salary', 'jobType', 'category', 'skills', 'experienceLevel', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) job[key] = req.body[key];
    }
    await job.save();

    res.json({ message: 'Job updated successfully', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete job
router.delete('/:id', auth, requireRole('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
