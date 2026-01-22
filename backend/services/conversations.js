const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const refreshConversationPreview = async (conversationId) => {
  const latest = await Message.findOne({
    conversationId,
    isDeleted: { $ne: true }
  }).sort({ createdAt: -1 });

  if (!latest) {
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageText: '',
      lastMessageAt: null
    });
    return null;
  }

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessageText: latest.body.slice(0, 180),
    lastMessageAt: latest.createdAt
  });

  return latest;
};

module.exports = { refreshConversationPreview };
