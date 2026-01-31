const User = require('../models/User');

module.exports = async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('role roles');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const roles =
      Array.isArray(user.roles) && user.roles.length > 0
        ? user.roles
        : user.role
        ? [user.role]
        : [];

    if (roles.includes('admin')) {
      return next();
    }

    return res.status(403).json({ message: 'Admin access required' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
