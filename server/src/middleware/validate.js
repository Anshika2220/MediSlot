// server/src/middleware/validate.js
// Zod request validation middleware compatible with Express 5 & Zod 3/4
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source] || {};
      const parsed = schema.parse(dataToValidate);

      if (source === 'body') {
        req.body = parsed;
      } else if (source === 'query') {
        // In Express 5, req.query has only a getter, so mutate properties instead of reassigning
        for (const key of Object.keys(parsed)) {
          req.query[key] = parsed[key];
        }
        req.validatedQuery = parsed;
      } else if (source === 'params') {
        req.validatedParams = parsed;
      }

      next();
    } catch (err) {
      const issues = err.issues || err.errors;
      if (issues && Array.isArray(issues)) {
        const formattedErrors = issues.map((e) => ({
          field: e.path.join('.') || 'request',
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }
      next(err);
    }
  };
}
