const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');
const { ROLES } = require('../utils/constants');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.clientType === 'mobile_app' && decoded?.role === ROLES.STUDENT) {
      const user = await User.findById(decoded.sub)
        .select('mobileAppSessionActive mobileAppSessionKey')
        .lean();
      const isValidMobileSession =
        Boolean(user?.mobileAppSessionActive) &&
        Boolean(user?.mobileAppSessionKey) &&
        user.mobileAppSessionKey === decoded.appSessionKey;
      if (!isValidMobileSession) {
        return res.status(401).json({
          message: 'Session already active elsewhere. Please contact admin/super admin for reset.'
        });
      }
    }
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
