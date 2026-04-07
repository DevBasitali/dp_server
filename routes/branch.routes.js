const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const validate = require('../lib/validate');
const { createBranchSchema, updateBranchSchema } = require('../lib/schemas/branch.schemas');

router.use(requireAuth);

router.get('/', requireRole(['owner']), branchController.listBranches);
router.post('/', requireRole(['owner']), validate(createBranchSchema), branchController.createBranch);
router.get('/:id', requireRole(['owner', 'branch_manager']), branchController.getBranch);
router.put('/:id', requireRole(['owner']), validate(updateBranchSchema), branchController.updateBranch);
router.delete('/:id', requireRole(['owner']), branchController.deactivateBranch);

module.exports = router;
