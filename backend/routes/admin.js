const express = require('express');
const router = express.Router();
const SiteContent = require('../models/SiteContent');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

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

module.exports = router;
