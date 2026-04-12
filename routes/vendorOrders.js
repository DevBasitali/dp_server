const express = require('express');
const router = express.Router();
const vendorOrdersController = require('../controllers/vendorOrders.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { uploadOrderImages } = require('../middlewares/upload');

router.use(requireAuth);

router.post(
  '/',
  requireRole(['owner', 'branch_manager']),
  uploadOrderImages,
  vendorOrdersController.createOrder
);

router.get(
  '/',
  requireRole(['owner', 'branch_manager']),
  vendorOrdersController.listOrders
);

router.get(
  '/:id',
  requireRole(['owner', 'branch_manager', 'vendor']),
  vendorOrdersController.getOrder
);

router.get(
  '/:id/download',
  requireRole(['owner', 'branch_manager', 'vendor']),
  vendorOrdersController.downloadOrderPDF
);

router.put(
  '/:id',
  requireRole(['owner', 'branch_manager']),
  uploadOrderImages,
  vendorOrdersController.updateOrder
);

module.exports = router;
