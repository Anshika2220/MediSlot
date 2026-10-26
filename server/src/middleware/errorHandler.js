// server/src/middleware/errorHandler.js
// Central error handler — always the LAST middleware registered in app.js.
// Any thrown error or next(err) call lands here.
// In production we hide stack traces from the client.

export function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
    // Include validation errors array when present (from Zod middleware)
    ...(err.errors && { errors: err.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
