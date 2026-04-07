const authService = require('../services/auth.service');

exports.login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body.email, req.body.password);
    res.json({ success: true, data, message: 'Login successful' });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.userId);
    res.json({ success: true, data: { user }, message: 'User retrieved successfully' });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(
      req.user.userId,
      req.body.current_password,
      req.body.new_password
    );
    res.json({ success: true, data: {}, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  authService.logout(token);
  res.json({ success: true, data: {}, message: 'Logged out successfully' });
};
