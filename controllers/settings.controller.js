const settingsService = require('../services/settings.service');

exports.getWhatsapp = async (req, res, next) => {
  try {
    const data = await settingsService.getWhatsapp({ requestingUser: req.user });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateWhatsapp = async (req, res, next) => {
  try {
    const data = await settingsService.updateWhatsapp({ body: req.body, requestingUser: req.user });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.testWhatsapp = async (req, res, next) => {
  try {
    const data = await settingsService.testWhatsapp({ requestingUser: req.user });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
