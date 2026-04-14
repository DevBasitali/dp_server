const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth);
router.use(requireRole(['owner']));

router.get('/whatsapp', settingsController.getWhatsapp);
router.put('/whatsapp', settingsController.updateWhatsapp);
router.post('/whatsapp/test', settingsController.testWhatsapp);

module.exports = router;
