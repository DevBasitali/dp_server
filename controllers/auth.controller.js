const authService = require('../services/auth.service');

exports.signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

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
    const token = req.headers.authorization.split(' ')[1];
    await authService.changePassword(
      req.user.userId,
      req.body.current_password,
      req.body.new_password,
      token
    );
    res.json({ success: true, data: {}, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

exports.superAdminLogin = async (req, res, next) => {
  try {
    const result = await authService.superAdminLogin(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  authService.logout(token);
  res.json({ success: true, data: {}, message: 'Logged out successfully' });
};
