const vendorLedgerService = require('../services/vendorLedger.service');

exports.getLedger = async (req, res, next) => {
  try {
    const data = await vendorLedgerService.getLedger({
      vendorId: req.params.vendorId,
      requestingUser: req.user,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.recordInventory = async (req, res, next) => {
  try {
    const data = await vendorLedgerService.recordInventory({
      body: req.body,
      requestingUser: req.user,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const data = await vendorLedgerService.recordPayment({
      body: req.body,
      requestingUser: req.user,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getOutstanding = async (req, res, next) => {
  try {
    const data = await vendorLedgerService.getOutstanding(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
