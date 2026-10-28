// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'medislot_super_secret_dev_key_change_in_production';

/**
 * JWT Authentication Middleware
 * Verifies Bearer token in Authorization header
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: No authentication token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Standardize _id to match Mongoose conventions
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
      doctorId: decoded.doctorId || null,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }
}


/**
 * Role-based Authorization Middleware
 * Enforces access based on user role (e.g. 'patient' vs 'doctor')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
}
