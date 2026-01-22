const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const limit = Number(req.query?.limit || 30);
    const unreadOnly = String(req.query?.unreadOnly || '') === 'true';
    const query = { userId: req.userId };
    if (unreadOnly) {
      query.readAt = null;
    }
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number.isNaN(limit) ? 30 : Math.max(1, Math.min(limit, 100)));

    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      readAt: null
    });

    return res.json({ notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/read', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.userId, readAt: null },
      { readAt: new Date() }
    );
    return res.json({ message: 'Notifications marked read', count: result.modifiedCount || 0 });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.json({ message: 'Notification marked read' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
