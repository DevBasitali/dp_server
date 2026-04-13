const dashboardService = require('../services/dashboard.service');

exports.getOwnerDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getOwnerDashboard({
      requestingUser: req.user,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
