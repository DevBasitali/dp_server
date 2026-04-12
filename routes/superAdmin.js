const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/superAdmin.controller');

router.get('/dashboard', ctrl.getDashboard);
router.get('/owners', ctrl.listOwners);
router.post('/owners', ctrl.createOwner);
router.put('/owners/:id/approve', ctrl.approveOwner);
router.put('/owners/:id/ban', ctrl.banOwner);
router.put('/owners/:id/unban', ctrl.unbanOwner);
router.post('/super-admins', ctrl.createSuperAdmin);
router.get('/owners/:id/data', ctrl.getOwnerData);

module.exports = router;
