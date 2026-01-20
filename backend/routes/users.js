const express = require('express');
const { Storage } = require('@google-cloud/storage');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const buildRegex = (value) => new RegExp(String(value).trim(), 'i');
const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_RESUME_BYTES = 2 * 1024 * 1024;
const RESUME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

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
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
  };
  return map[contentType] || contentType.split('/')[1] || 'bin';
};

const uploadGcsDataUrl = async ({ dataUrl, userId, folder, maxBytes, allowedTypes }) => {
  const match = /^data:([a-zA-Z0-9.+-\/]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid file data');
  }

  const contentType = match[1];
  if (allowedTypes && !allowedTypes.has(contentType)) {
    throw new Error('Unsupported file type');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > maxBytes) {
    throw new Error('File is too large');
  }

  const ext = extensionForType(contentType);
  const filename = `${folder}/${userId}/${Date.now()}.${ext}`;

  const { bucketName, publicBase, storage } = getGcsConfig();
  const file = storage.bucket(bucketName).file(filename);
  await file.save(buffer, { metadata: { contentType }, resumable: false, validation: 'md5' });

  return publicBase ? `${publicBase}/${filename}` : `https://storage.googleapis.com/${bucketName}/${filename}`;
};

const uploadProfileImage = async (dataUrl, userId) =>
  uploadGcsDataUrl({
    dataUrl,
    userId,
    folder: 'profiles',
    maxBytes: MAX_IMAGE_BYTES,
    allowedTypes: new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']),
  });

const uploadCompanyLogo = async (dataUrl, userId) =>
  uploadGcsDataUrl({
    dataUrl,
    userId,
    folder: 'company-logos',
    maxBytes: MAX_IMAGE_BYTES,
    allowedTypes: new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']),
  });

const uploadResumeFile = async (dataUrl, userId) =>
  uploadGcsDataUrl({
    dataUrl,
    userId,
    folder: 'resumes',
    maxBytes: MAX_RESUME_BYTES,
    allowedTypes: RESUME_TYPES,
  });

router.post('/upload-resume', auth, requireRole('worker'), async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ message: 'Resume file is required' });
    }
    const url = await uploadResumeFile(dataUrl, req.userId);
    return res.json({ url });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Public worker listing with filters
router.get('/workers', async (req, res) => {
  try {
    const { search, location, skill, availability, minExp, maxExp } = req.query;
    const filter = { role: 'worker', isDiscoverable: true };

    if (location) {
      filter.location = { $regex: buildRegex(location) };
    }

    if (availability) {
      filter.availability = availability;
    }

    const expFilter = {};
    if (minExp !== undefined) {
      const min = Number(minExp);
      if (!Number.isNaN(min)) expFilter.$gte = min;
    }
    if (maxExp !== undefined) {
      const max = Number(maxExp);
      if (!Number.isNaN(max)) expFilter.$lte = max;
    }
    if (Object.keys(expFilter).length > 0) {
      filter.yearsExperience = expFilter;
    }

    if (skill) {
      const regex = buildRegex(skill);
      filter.skills = { $elemMatch: { $regex: regex } };
    }

    if (search) {
      const regex = buildRegex(search);
      filter.$or = [
        { name: { $regex: regex } },
        { headline: { $regex: regex } },
        { summary: { $regex: regex } },
        { skills: { $elemMatch: { $regex: regex } } },
        { desiredRoles: { $elemMatch: { $regex: regex } } },
      ];
    }

    const workers = await User.find(filter)
      .select('name role location headline summary skills yearsExperience desiredRoles availability profilePicture portfolioUrl linkedinUrl githubUrl createdAt');

    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.params.id !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const allowed = [
      'name',
      'phone',
      'location',
      'bio',
      'profilePicture',
      'companyName',
      'companyWebsite',
      'companyDescription',
      'companyLogo',
      'headline',
      'summary',
      'skills',
      'yearsExperience',
      'desiredRoles',
      'availability',
      'portfolioUrl',
      'linkedinUrl',
      'githubUrl',
      'allowContact',
      'chatApp',
      'chatHandle',
      'resumeUrl',
      'isDiscoverable',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (typeof updates.profilePicture === 'string') {
      const value = updates.profilePicture.trim();
      if (value.startsWith('data:image/')) {
        updates.profilePicture = await uploadProfileImage(value, req.userId);
      } else if (value === '') {
        updates.profilePicture = '';
      } else {
        const publicBase = process.env.GCS_PUBLIC_BASE_URL;
        if (!publicBase || !value.startsWith(publicBase)) {
          return res.status(400).json({ message: 'Profile image must be uploaded from device' });
        }
      }
    }

    if (typeof updates.companyLogo === 'string') {
      const value = updates.companyLogo.trim();
      if (value.startsWith('data:image/')) {
        updates.companyLogo = await uploadCompanyLogo(value, req.userId);
      } else if (value === '') {
        updates.companyLogo = '';
      } else if (/^https?:\/\//.test(value)) {
        updates.companyLogo = value;
      } else {
        return res.status(400).json({ message: 'Company logo must be a URL or uploaded image' });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true
    }).select('-password');

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
