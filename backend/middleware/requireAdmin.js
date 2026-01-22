const User = require('../models/User');

const parseList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

module.exports = async function requireAdmin(req, res, next) {
  try {
    const adminIds = parseList(process.env.ADMIN_USER_IDS);
    if (adminIds.includes(String(req.userId))) {
      return next();
    }

    const adminEmails = parseList(process.env.ADMIN_EMAILS).map((value) => value.toLowerCase());
    if (adminEmails.length > 0) {
      const user = await User.findById(req.userId).select('email');
      if (user && adminEmails.includes(String(user.email || '').toLowerCase())) {
        return next();
      }
    }

    return res.status(403).json({ message: 'Admin access required' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
