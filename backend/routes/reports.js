const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Report = require('../models/Report');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const auth = require('../middleware/auth');

const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/', auth, reportLimiter, async (req, res) => {
  try {
    const targetUserId = String(req.body?.targetUserId || '').trim();
    const messageId = req.body?.messageId ? String(req.body.messageId).trim() : '';
    const conversationId = req.body?.conversationId ? String(req.body.conversationId).trim() : '';
    const reason = String(req.body?.reason || '').trim();

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user is required' });
    }
    if (targetUserId === String(req.userId)) {
      return res.status(400).json({ message: 'Cannot report yourself' });
    }
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const targetExists = await User.findById(targetUserId).select('_id');
    if (!targetExists) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    if (messageId) {
      const message = await Message.findById(messageId).select('conversationId senderId recipientId');
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      const isParticipant =
        String(message.senderId) === String(req.userId) ||
        String(message.recipientId) === String(req.userId);
      if (!isParticipant) {
        return res.status(403).json({ message: 'Not authorized to report this message' });
      }
      const matchesTarget =
        String(message.senderId) === String(targetUserId) ||
        String(message.recipientId) === String(targetUserId);
      if (!matchesTarget) {
        return res.status(400).json({ message: 'Target user does not match message' });
      }
    }

    if (conversationId) {
      const conversation = await Conversation.findById(conversationId).select('participants');
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      const isParticipant = conversation.participants.some(
        (participant) => String(participant) === String(req.userId)
      );
      if (!isParticipant) {
        return res.status(403).json({ message: 'Not authorized to report this conversation' });
      }
      const matchesTarget = conversation.participants.some(
        (participant) => String(participant) === String(targetUserId)
      );
      if (!matchesTarget) {
        return res.status(400).json({ message: 'Target user is not in conversation' });
      }
    }

    const report = new Report({
      reporterId: req.userId,
      targetUserId,
      messageId: messageId || undefined,
      conversationId: conversationId || undefined,
      reason
    });
    await report.save();

    return res.status(201).json({ message: 'Report submitted', id: report._id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
