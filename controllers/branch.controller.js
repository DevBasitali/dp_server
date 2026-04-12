const branchService = require('../services/branch.service');

exports.listBranches = async (req, res, next) => {
  try {
    const branches = await branchService.listBranches(req.user);
    res.json({ success: true, data: branches, message: 'Branches retrieved successfully' });
  } catch (err) {
    next(err);
  }
};

exports.createBranch = async (req, res, next) => {
  try {
    const branch = await branchService.createBranch(req.body, req.user);
    res.status(201).json({ success: true, data: branch, message: 'Branch created' });
  } catch (err) {
    next(err);
  }
};

exports.getBranch = async (req, res, next) => {
  try {
    const branch = await branchService.getBranch(req.params.id, req.user);
    res.json({ success: true, data: branch, message: 'Branch found' });
  } catch (err) {
    next(err);
  }
};

exports.updateBranch = async (req, res, next) => {
  try {
    const branch = await branchService.updateBranch(req.params.id, req.body, req.user);
    res.json({ success: true, data: branch, message: 'Branch updated' });
  } catch (err) {
    next(err);
  }
};

exports.deactivateBranch = async (req, res, next) => {
  try {
    await branchService.deactivateBranch(req.params.id, req.user);
    res.json({ success: true, data: {}, message: 'Branch deactivated successfully' });
  } catch (err) {
    next(err);
  }
};
