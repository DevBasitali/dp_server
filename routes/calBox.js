const express = require('express');
const router = express.Router();
const calBoxController = require('../controllers/calBox.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth);

router.get('/', requireRole(['owner']), calBoxController.listAll);
router.get('/:branchId', requireRole(['owner', 'branch_manager']), calBoxController.getByBranch);

module.exports = router;
