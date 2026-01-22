const express = require('express');
const router = express.Router();
const Block = require('../models/Block');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const blocks = await Block.find({ blockerId: req.userId }).populate(
      'blockedId',
      'name profilePicture role companyName'
    );
    const payload = blocks.map((block) => ({
      id: block._id,
      blockedAt: block.createdAt,
      user: block.blockedId
        ? {
            id: block.blockedId._id,
            name: block.blockedId.name,
            profilePicture: block.blockedId.profilePicture,
            role: block.blockedId.role,
            companyName: block.blockedId.companyName
          }
        : null
    }));
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/status/:userId', auth, async (req, res) => {
  try {
    const targetId = String(req.params.userId || '').trim();
    if (!targetId) {
      return res.status(400).json({ message: 'User is required' });
    }
    const blocked = await Block.findOne({ blockerId: req.userId, blockedId: targetId });
    const blockedBy = await Block.findOne({ blockerId: targetId, blockedId: req.userId });
    return res.json({ blocked: Boolean(blocked), blockedBy: Boolean(blockedBy) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const targetId = String(req.body?.userId || '').trim();
    if (!targetId) {
      return res.status(400).json({ message: 'User is required' });
    }
    if (targetId === String(req.userId)) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }
    const exists = await User.findById(targetId).select('_id');
    if (!exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    const block = await Block.findOneAndUpdate(
      { blockerId: req.userId, blockedId: targetId },
      { $setOnInsert: { blockerId: req.userId, blockedId: targetId } },
      { upsert: true, new: true }
    );
    return res.status(201).json({ message: 'User blocked', id: block._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({ message: 'User blocked' });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/:userId', auth, async (req, res) => {
  try {
    const targetId = String(req.params.userId || '').trim();
    if (!targetId) {
      return res.status(400).json({ message: 'User is required' });
    }
    await Block.deleteOne({ blockerId: req.userId, blockedId: targetId });
    return res.json({ message: 'User unblocked' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
