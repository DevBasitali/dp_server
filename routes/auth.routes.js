const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const validate = require('../lib/validate');
const { loginSchema, changePasswordSchema } = require('../lib/schemas/auth.schemas');

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);
router.put('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
