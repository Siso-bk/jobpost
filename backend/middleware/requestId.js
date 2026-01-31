const crypto = require('crypto');

function buildRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

module.exports = function requestId() {
  return (req, res, next) => {
    const incoming = req.headers['x-request-id'];
    const id =
      typeof incoming === 'string' && incoming.trim().length > 0 ? incoming.trim() : buildRequestId();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  };
};
