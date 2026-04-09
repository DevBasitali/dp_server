const monthlyClosingsService = require('../services/monthlyClosings.service');

exports.create = async (req, res, next) => {
  try {
    const monthlyClosing = await monthlyClosingsService.create({
      body: req.body,
      requestingUser: req.user,
    });
    res.status(201).json({ success: true, data: monthlyClosing });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const monthlyClosings = await monthlyClosingsService.list({
      requestingUser: req.user,
      query: req.query,
    });
    res.json({ success: true, data: monthlyClosings });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const monthlyClosing = await monthlyClosingsService.getById({
      id: req.params.id,
      requestingUser: req.user,
    });
    res.json({ success: true, data: monthlyClosing });
  } catch (err) {
    next(err);
  }
};
