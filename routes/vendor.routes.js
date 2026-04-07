const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const validate = require('../lib/validate');
const { createVendorSchema, updateVendorSchema } = require('../lib/schemas/vendor.schemas');

router.use(requireAuth);

router.get('/', requireRole(['owner', 'branch_manager']), vendorController.listVendors);
router.post('/', requireRole(['owner']), validate(createVendorSchema), vendorController.createVendor);
router.get('/:id', requireRole(['owner', 'branch_manager', 'vendor']), vendorController.getVendor);
router.put('/:id', requireRole(['owner']), validate(updateVendorSchema), vendorController.updateVendor);
router.delete('/:id', requireRole(['owner']), vendorController.deactivateVendor);

router.get('/:id/ledger', requireRole(['owner', 'branch_manager', 'vendor']), vendorController.getVendorLedger);
router.get('/:id/items', requireRole(['owner', 'branch_manager', 'vendor']), vendorController.getVendorItems);

module.exports = router;
