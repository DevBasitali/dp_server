const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const validate = require('../lib/validate');
const { createUserSchema, updateUserSchema } = require('../lib/schemas/user.schemas');

router.use(requireAuth);
router.use(requireRole(['owner']));

router.get('/', userController.listUsers);
router.post('/', validate(createUserSchema), userController.createUser);
router.get('/:id', userController.getUser);
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deactivateUser);

module.exports = router;
