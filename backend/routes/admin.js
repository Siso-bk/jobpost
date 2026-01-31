const express = require('express');
const router = express.Router();
const SiteContent = require('../models/SiteContent');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const buildRegex = (value) => new RegExp(String(value).trim(), 'i');

router.get('/home', auth, requireAdmin, async (req, res) => {
  try {
    const doc = await SiteContent.findOne({ key: 'home' }).lean();
    return res.json({
      content: doc?.data || null,
      updatedAt: doc?.updatedAt || null,
      updatedBy: doc?.updatedBy || null
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/home', auth, requireAdmin, async (req, res) => {
  try {
    const content = req.body?.content;
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ message: 'Content payload is required.' });
    }
    const doc = await SiteContent.findOneAndUpdate(
      { key: 'home' },
      { data: content, updatedBy: req.userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({
      message: 'Home page updated.',
      content: doc?.data || null,
      updatedAt: doc?.updatedAt || null
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/jobs', auth, requireAdmin, async (req, res) => {
  try {
    const status = String(req.query?.status || 'all');
    const hidden = String(req.query?.hidden || 'all');
    const search = String(req.query?.search || '').trim();
    const pageNum = Math.max(parseInt(String(req.query?.page || 1), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query?.limit || 20), 10) || 20, 1), 100);

    const filter = {};
    if (status !== 'all') {
      filter.status = status;
    }
    if (hidden === 'true') {
      filter.isHidden = true;
    } else if (hidden === 'false') {
      filter.isHidden = { $ne: true };
    }
    if (search) {
      const regex = buildRegex(search);
      filter.$or = [
        { title: { $regex: regex } },
        { company: { $regex: regex } },
        { location: { $regex: regex } }
      ];
    }

    const [items, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limit)
        .limit(limit)
        .populate('employerId', 'name email companyName'),
      Job.countDocuments(filter)
    ]);

    return res.json({
      items,
      page: pageNum,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
