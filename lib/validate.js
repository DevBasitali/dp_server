const AppError = require('./errors');

// Middleware factory — validates req.body against a Zod schema.
// On failure, formats all Zod errors into a single readable message and passes an AppError(400) to next().
// On success, replaces req.body with the parsed (coerced + stripped) data.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.issues
      .map((e) => `${e.path.join('.') || 'body'}: ${e.message}`)
      .join('; ');
    return next(new AppError(message, 400));
  }

  req.body = result.data;
  next();
};

module.exports = validate;
