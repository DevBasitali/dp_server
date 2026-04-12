const express = require('express');
const router = express.Router();
const vendorLedgerController = require('../controllers/vendorLedger.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const validate = require('../lib/validate');
const { createInventorySchema, createPaymentSchema } = require('../lib/schemas/vendorLedger.schemas');

router.use(requireAuth);

// Static routes before /:vendorId to avoid param capture
router.get('/outstanding', requireRole(['owner']), vendorLedgerController.getOutstanding);

router.post('/inventory', requireRole(['owner', 'branch_manager']), validate(createInventorySchema), vendorLedgerController.recordInventory);

router.post('/payment', requireRole(['owner', 'branch_manager']), validate(createPaymentSchema), vendorLedgerController.recordPayment);

router.get('/:vendorId', requireRole(['owner', 'branch_manager', 'vendor']), vendorLedgerController.getLedger);

module.exports = router;
