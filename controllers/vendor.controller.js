const vendorService = require('../services/vendor.service');

exports.listVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.listVendors(req.user);
    res.json({ success: true, data: vendors, message: 'Vendors retrieved successfully' });
  } catch (err) {
    next(err);
  }
};

exports.createVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body, req.user);
    res.status(201).json({ success: true, data: vendor, message: 'Vendor created' });
  } catch (err) {
    next(err);
  }
};

exports.getVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendor(req.params.id, req.user);
    res.json({ success: true, data: vendor, message: 'Vendor profile found' });
  } catch (err) {
    next(err);
  }
};

exports.updateVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body, req.user);
    res.json({ success: true, data: vendor, message: 'Vendor updated' });
  } catch (err) {
    next(err);
  }
};

exports.deactivateVendor = async (req, res, next) => {
  try {
    await vendorService.deactivateVendor(req.params.id, req.user);
    res.json({ success: true, data: {}, message: 'Vendor deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getVendorLedger = async (req, res, next) => {
  try {
    const data = await vendorService.getVendorLedger(req.params.id);
    res.json({ success: true, data, message: 'Vendor ledger' });
  } catch (err) {
    next(err);
  }
};

exports.getVendorItems = async (req, res, next) => {
  try {
    const data = await vendorService.getVendorItems(req.params.id, req.user);
    res.json({ success: true, data, message: 'Vendor items' });
  } catch (err) {
    next(err);
  }
};
