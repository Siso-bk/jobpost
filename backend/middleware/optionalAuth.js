const jwt = require('jsonwebtoken');

const optionalAuth = (req, _res, next) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      token = req.cookies && req.cookies['token'];
    }
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRoles = Array.isArray(decoded.roles) ? decoded.roles.filter(Boolean) : [];
    return next();
  } catch (error) {
    return next();
  }
};

module.exports = optionalAuth;
