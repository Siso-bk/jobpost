const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { refreshConversationPreview } = require('../services/conversations');

router.get('/reports', auth, requireAdmin, async (req, res) => {
  try {
    const status = String(req.query?.status || 'open');
    const filter = status === 'all' ? {} : { status };
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .populate('reporterId', 'name email roles')
      .populate('targetUserId', 'name email roles')
      .populate('messageId', 'body senderId recipientId createdAt')
      .populate('conversationId', '_id');

    return res.json(reports);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/reports/:id/resolve', auth, requireAdmin, async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.userId },
      { new: true }
    );
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    return res.json({ message: 'Report resolved', report });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/messages/:id/remove', auth, requireAdmin, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    message.body = '[message removed]';
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.userId;
    await message.save();

    await Notification.updateMany(
      { 'data.messageId': message._id },
      { title: 'Message removed', body: 'A message was removed by moderation.' }
    );

    await refreshConversationPreview(message.conversationId);

    return res.json({ message: 'Message removed' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
