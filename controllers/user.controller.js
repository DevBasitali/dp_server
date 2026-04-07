const userService = require('../services/user.service');

exports.listUsers = async (req, res, next) => {
  try {
    const users = await userService.listUsers();
    res.json({ success: true, data: users, message: 'Users retrieved successfully' });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ success: true, data: user, message: 'User created' });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await userService.getUser(req.params.id);
    res.json({ success: true, data: user, message: 'User found' });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: user, message: 'User updated' });
  } catch (err) {
    next(err);
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    await userService.deactivateUser(req.params.id);
    res.json({ success: true, data: {}, message: 'User deactivated successfully' });
  } catch (err) {
    next(err);
  }
};
