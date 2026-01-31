const express = require('express');
const router = express.Router();
const SiteContent = require('../models/SiteContent');

router.get('/home', async (req, res) => {
  try {
    const doc = await SiteContent.findOne({ key: 'home' }).lean();
    return res.json({
      content: doc?.data || null,
      updatedAt: doc?.updatedAt || null
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
