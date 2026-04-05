const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

// All user routes require Owner access
router.use(requireAuth);
router.use(requireRole(['owner']));

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deactivateUser);

module.exports = router;
