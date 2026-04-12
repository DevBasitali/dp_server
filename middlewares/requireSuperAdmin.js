const AppError = require('../lib/errors');

module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return next(new AppError('Super admin access required.', 403));
  }
  next();
};
