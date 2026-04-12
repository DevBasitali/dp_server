const calBoxService = require('../services/calBox.service');

exports.listAll = async (req, res, next) => {
  try {
    const data = await calBoxService.listAll(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getByBranch = async (req, res, next) => {
  try {
    const data = await calBoxService.getByBranch({
      branchId: req.params.branchId,
      requestingUser: req.user,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
