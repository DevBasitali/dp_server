const dailyClosingsService = require('../services/dailyClosings.service');

exports.create = async (req, res, next) => {
  try {
    const closing = await dailyClosingsService.create({
      body: req.body,
      requestingUser: req.user,
    });
    res.status(201).json({ success: true, data: closing });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const closings = await dailyClosingsService.list({
      requestingUser: req.user,
      query: req.query,
    });
    res.json({ success: true, data: closings });
  } catch (err) {
    next(err);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    const summary = await dailyClosingsService.getSummary({
      requestingUser: req.user,
      query: req.query,
    });
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const closing = await dailyClosingsService.update({
      id: req.params.id,
      body: req.body,
      requestingUser: req.user,
    });
    res.json({ success: true, data: closing });
  } catch (err) {
    next(err);
  }
};
