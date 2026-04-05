const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth);

// List vendors (Owner, Branch Manager)
router.get('/', requireRole(['owner', 'branch_manager']), vendorController.listVendors);

// Create, Update, Delete (Owner only)
router.post('/', requireRole(['owner']), vendorController.createVendor);
router.put('/:id', requireRole(['owner']), vendorController.updateVendor);
router.delete('/:id', requireRole(['owner']), vendorController.deactivateVendor);

// Get single vendor profile (Owner, Branch Manager, or Vendor own)
router.get('/:id', requireRole(['owner', 'branch_manager', 'vendor']), vendorController.getVendor);

// Stubs for ledger and items (to be fully fleshed out later)
router.get('/:id/ledger', requireRole(['owner', 'branch_manager', 'vendor']), vendorController.getVendorLedger);
router.get('/:id/items', requireRole(['owner', 'branch_manager', 'vendor']), vendorController.getVendorItems);

module.exports = router;
