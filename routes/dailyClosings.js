const express = require('express');
const router = express.Router();
const dailyClosingsController = require('../controllers/dailyClosings.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const validate = require('../lib/validate');
const { createDailyClosingSchema, updateDailyClosingSchema } = require('../lib/schemas/dailyClosing.schemas');

router.use(requireAuth);

router.post('/', requireRole(['owner', 'branch_manager']), validate(createDailyClosingSchema), dailyClosingsController.create);

// /summary must be registered before /:id to avoid param capture
router.get('/summary', requireRole(['owner', 'branch_manager']), dailyClosingsController.getSummary);

router.get('/', requireRole(['owner', 'branch_manager']), dailyClosingsController.list);

router.put('/:id', requireRole(['owner', 'branch_manager']), validate(updateDailyClosingSchema), dailyClosingsController.update);
router.delete('/:id', requireRole(['owner', 'branch_manager']), dailyClosingsController.deleteClosing);

module.exports = router;
