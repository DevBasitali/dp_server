const express = require('express');
const router = express.Router();
const monthlyClosingsController = require('../controllers/monthlyClosings.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const validate = require('../lib/validate');
const { createMonthlyClosingSchema } = require('../lib/schemas/monthlyClosing.schemas');

router.use(requireAuth);

router.post('/', requireRole(['branch_manager']), validate(createMonthlyClosingSchema), monthlyClosingsController.create);

router.get('/', requireRole(['owner', 'branch_manager']), monthlyClosingsController.list);

router.get('/:id', requireRole(['owner', 'branch_manager']), monthlyClosingsController.getById);

module.exports = router;
