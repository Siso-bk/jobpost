const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const { refreshConversationPreview } = require('./conversations');

const daysToMs = (days) => days * 24 * 60 * 60 * 1000;

const parsePositiveNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
};

const cleanupMessages = async (days) => {
  const cutoff = new Date(Date.now() - daysToMs(days));
  const oldMessages = await Message.find({ createdAt: { $lt: cutoff } }).select(
    '_id conversationId'
  );
  if (!oldMessages.length) return 0;
  const conversationIds = [
    ...new Set(oldMessages.map((message) => String(message.conversationId)))
  ];
  await Message.deleteMany({ _id: { $in: oldMessages.map((message) => message._id) } });
  await Promise.all(conversationIds.map((id) => refreshConversationPreview(id)));
  return oldMessages.length;
};

const cleanupNotifications = async (days) => {
  const cutoff = new Date(Date.now() - daysToMs(days));
  const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
  return result.deletedCount || 0;
};

const cleanupReports = async (days) => {
  const cutoff = new Date(Date.now() - daysToMs(days));
  const result = await Report.deleteMany({
    status: 'resolved',
    resolvedAt: { $lt: cutoff }
  });
  return result.deletedCount || 0;
};

const runRetentionCleanup = async () => {
  const chatDays =
    parsePositiveNumber(process.env.MESSAGE_RETENTION_DAYS) ||
    parsePositiveNumber(process.env.CHAT_RETENTION_DAYS);
  const notificationDays =
    parsePositiveNumber(process.env.NOTIFICATION_RETENTION_DAYS) ||
    parsePositiveNumber(process.env.CHAT_RETENTION_DAYS);
  const reportDays = parsePositiveNumber(process.env.REPORT_RETENTION_DAYS);

  try {
    if (chatDays) {
      await cleanupMessages(chatDays);
    }
    if (notificationDays) {
      await cleanupNotifications(notificationDays);
    }
    if (reportDays) {
      await cleanupReports(reportDays);
    }
  } catch (error) {
    console.warn('Retention cleanup failed:', error.message);
  }
};

const startRetentionCleanup = () => {
  if (process.env.NODE_ENV === 'test') return;
  const intervalHours = parsePositiveNumber(process.env.RETENTION_RUN_HOURS) || 24;
  const intervalMs = intervalHours * 60 * 60 * 1000;
  runRetentionCleanup();
  setInterval(runRetentionCleanup, intervalMs);
};

module.exports = { startRetentionCleanup };
