const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth);

// Owner only routes
router.get('/', requireRole(['owner']), branchController.listBranches);
router.post('/', requireRole(['owner']), branchController.createBranch);
router.put('/:id', requireRole(['owner']), branchController.updateBranch);
router.delete('/:id', requireRole(['owner']), branchController.deactivateBranch);

// Mixed access routes (Owner or specific Branch Manager)
router.get('/:id', requireRole(['owner', 'branch_manager']), branchController.getBranch);

module.exports = router;
