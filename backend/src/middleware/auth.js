const jwt = require('jsonwebtoken');
const config = require('../config');

const requireAuth = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret);

      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
      }

      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired.', error: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
  };
};

const requireAdmin = requireAuth(['SUPER_ADMIN']);
const requireWarden = requireAuth(['SUPER_ADMIN', 'WARDEN']);
const requireStaff = requireAuth(['SUPER_ADMIN', 'WARDEN', 'STAFF']);
const requireStudent = requireAuth(['STUDENT']);
const requireAny = requireAuth();

module.exports = { requireAuth, requireAdmin, requireWarden, requireStaff, requireStudent, requireAny };
