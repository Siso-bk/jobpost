const requireRole = (role) => (req, res, next) => {
  if (!Array.isArray(req.userRoles) || req.userRoles.length === 0) {
    return res.status(401).json({ message: 'Roles missing from token' });
  }
  if (!req.userRoles.includes(role)) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  return next();
};

module.exports = requireRole;
