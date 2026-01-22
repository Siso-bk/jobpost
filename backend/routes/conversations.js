const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Block = require('../models/Block');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const formatConversation = (conversation, userId, unreadCount = 0) => {
  const other = conversation.participants.find(
    (participant) => String(participant._id) !== String(userId)
  );
  return {
    id: conversation._id,
    other: other
      ? {
          id: other._id,
          name: other.name,
          profilePicture: other.profilePicture,
          role: other.role,
          companyName: other.companyName
        }
      : null,
    lastMessageText: conversation.lastMessageText || '',
    lastMessageAt: conversation.lastMessageAt,
    updatedAt: conversation.updatedAt,
    unreadCount
  };
};

const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

// List conversations for current user
router.get('/', auth, async (req, res) => {
  try {
    const blocks = await Block.find({
      $or: [{ blockerId: req.userId }, { blockedId: req.userId }]
    });
    const blockedIds = new Set(
      blocks.map((block) =>
        String(block.blockerId) === String(req.userId)
          ? String(block.blockedId)
          : String(block.blockerId)
      )
    );

    const conversations = await Conversation.find({ participants: req.userId })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name profilePicture role companyName');

    const visible = conversations.filter((conversation) => {
      const other = conversation.participants.find(
        (participant) => String(participant._id) !== String(req.userId)
      );
      return other ? !blockedIds.has(String(other._id)) : true;
    });

    const unreadCounts = await Promise.all(
      visible.map((conversation) =>
        Message.countDocuments({
          conversationId: conversation._id,
          recipientId: req.userId,
          readAt: null,
          isDeleted: { $ne: true }
        })
      )
    );

    const payload = visible.map((conversation, index) =>
      formatConversation(conversation, req.userId, unreadCounts[index])
    );
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Create or return conversation with another user
router.post('/', auth, createLimiter, async (req, res) => {
  try {
    const recipientId = String(req.body?.recipientId || '').trim();
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient is required' });
    }
    if (recipientId === String(req.userId)) {
      return res.status(400).json({ message: 'Cannot message yourself' });
    }

    const block = await Block.findOne({
      $or: [
        { blockerId: req.userId, blockedId: recipientId },
        { blockerId: recipientId, blockedId: req.userId }
      ]
    });
    if (block) {
      return res.status(403).json({ message: 'Chat is blocked' });
    }

    const recipient = await User.findById(recipientId).select(
      '_id name profilePicture role companyName'
    );
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, recipientId] }
    }).populate('participants', 'name profilePicture role companyName');

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.userId, recipientId]
      });
      await conversation.save();
      await conversation.populate('participants', 'name profilePicture role companyName');
    }

    return res.json(formatConversation(conversation, req.userId));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get total unread count for current user
router.get('/unread-count', auth, async (req, res) => {
  try {
    const blocks = await Block.find({
      $or: [{ blockerId: req.userId }, { blockedId: req.userId }]
    });
    const blockedIds = blocks.map((block) =>
      String(block.blockerId) === String(req.userId)
        ? String(block.blockedId)
        : String(block.blockerId)
    );
    const query = {
      recipientId: req.userId,
      readAt: null,
      isDeleted: { $ne: true }
    };
    if (blockedIds.length) {
      query.senderId = { $nin: blockedIds };
    }
    const count = await Message.countDocuments(query);
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Mark conversation as read
router.post('/:id/read', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const participants = conversation.participants.map((participant) =>
      String(participant)
    );
    if (!participants.includes(String(req.userId))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const block = await Block.findOne({
      $or: [
        { blockerId: req.userId, blockedId: { $in: participants } },
        { blockedId: req.userId, blockerId: { $in: participants } }
      ]
    });
    if (block) {
      return res.status(403).json({ message: 'Chat is blocked' });
    }

    const result = await Message.updateMany(
      { conversationId: conversation._id, recipientId: req.userId, readAt: null },
      { readAt: new Date() }
    );

    await Notification.updateMany(
      {
        userId: req.userId,
        type: 'message',
        'data.conversationId': conversation._id,
        readAt: null
      },
      { readAt: new Date() }
    );

    return res.json({ message: 'Conversation marked read', count: result.modifiedCount || 0 });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get messages for a conversation
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const isParticipant = conversation.participants.some(
      (participant) => String(participant) === String(req.userId)
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const participants = conversation.participants.map((participant) =>
      String(participant)
    );
    const block = await Block.findOne({
      $or: [
        { blockerId: req.userId, blockedId: { $in: participants } },
        { blockedId: req.userId, blockerId: { $in: participants } }
      ]
    });
    if (block) {
      return res.status(403).json({ message: 'Chat is blocked' });
    }

    const limit = Number(req.query?.limit || 50);
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(Number.isNaN(limit) ? 50 : Math.max(1, Math.min(limit, 200)));

    return res.json({ conversationId: conversation._id, messages });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Send a message in a conversation
router.post('/:id/messages', auth, messageLimiter, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const participants = conversation.participants.map((participant) =>
      String(participant)
    );
    if (!participants.includes(String(req.userId))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const block = await Block.findOne({
      $or: [
        { blockerId: req.userId, blockedId: { $in: participants } },
        { blockedId: req.userId, blockerId: { $in: participants } }
      ]
    });
    if (block) {
      return res.status(403).json({ message: 'Chat is blocked' });
    }

    const body = String(req.body?.body || '').trim();
    if (!body) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }
    if (body.length > 2000) {
      return res.status(400).json({ message: 'Message is too long' });
    }

    const recipientId = participants.find((id) => id !== String(req.userId));
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient is required' });
    }

    const message = new Message({
      conversationId: conversation._id,
      senderId: req.userId,
      recipientId,
      body
    });
    await message.save();

    conversation.lastMessageText = body.slice(0, 180);
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    await Notification.create({
      userId: recipientId,
      type: 'message',
      title: 'New message',
      body: body.slice(0, 180),
      link: `/messages?c=${conversation._id}`,
      data: {
        conversationId: conversation._id,
        senderId: req.userId,
        messageId: message._id
      }
    });

    return res.status(201).json({ message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
