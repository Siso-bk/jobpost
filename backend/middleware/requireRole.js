const requireRole = (role) => (req, res, next) => {
  if (!req.userRole) {
    return res.status(401).json({ message: 'Role missing from token' });
  }
  if (req.userRole !== role) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  return next();
};

module.exports = requireRole;
