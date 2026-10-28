// server/src/middleware/errorHandler.js
// Central error handler for all unhandled operational & database errors

export function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // 1. Mongoose Invalid ObjectId CastError -> 400 Bad Request
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid resource identifier format: ${err.value}`;
  }

  // 2. Mongoose Duplicate Key Error (e.g. unique email, unique slot index) -> 409 Conflict
  if (err.code === 11000) {
    status = 409;
    const fields = Object.keys(err.keyPattern || {}).join(', ');
    message = `Duplicate resource collision: conflict on field (${fields})`;
  }

  // 3. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Authentication token expired. Please log in again.';
  }

  // Suppress internal stack traces in production
  res.status(status).json({
    success: false,
    message,
    ...(err.errors && { errors: err.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
