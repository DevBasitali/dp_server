const superAdminService = require('../services/superAdmin.service');

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await superAdminService.getDashboard();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.listOwners = async (req, res, next) => {
  try {
    const data = await superAdminService.listOwners(req.query.status);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createOwner = async (req, res, next) => {
  try {
    const data = await superAdminService.createOwner(req.body);
    res.status(201).json({ success: true, data, message: 'Owner created successfully' });
  } catch (err) {
    next(err);
  }
};

exports.approveOwner = async (req, res, next) => {
  try {
    const data = await superAdminService.approveOwner(req.params.id);
    res.json({ success: true, data, message: 'Owner approved successfully' });
  } catch (err) {
    next(err);
  }
};

exports.banOwner = async (req, res, next) => {
  try {
    const data = await superAdminService.banOwner(req.params.id);
    res.json({ success: true, data, message: 'Owner banned successfully' });
  } catch (err) {
    next(err);
  }
};

exports.unbanOwner = async (req, res, next) => {
  try {
    const data = await superAdminService.unbanOwner(req.params.id);
    res.json({ success: true, data, message: 'Owner unbanned successfully' });
  } catch (err) {
    next(err);
  }
};

exports.createSuperAdmin = async (req, res, next) => {
  try {
    const data = await superAdminService.createSuperAdmin(req.body);
    res.status(201).json({ success: true, data, message: 'Super admin created successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getOwnerData = async (req, res, next) => {
  try {
    const data = await superAdminService.getOwnerData(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
