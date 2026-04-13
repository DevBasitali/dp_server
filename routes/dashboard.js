const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { requireRole } = require('../middlewares/auth.middleware');

router.get('/owner', requireRole(['owner']), dashboardController.getOwnerDashboard);

module.exports = router;
