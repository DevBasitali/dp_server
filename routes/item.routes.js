const express = require('express');
const router = express.Router();
const itemController = require('../controllers/item.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const validate = require('../lib/validate');
const { createItemSchema, updateItemSchema } = require('../lib/schemas/item.schemas');

router.use(requireAuth);

router.get('/', requireRole(['owner', 'branch_manager']), itemController.listItems);
router.post('/', requireRole(['owner']), validate(createItemSchema), itemController.createItem);
router.get('/:id', requireRole(['owner', 'branch_manager']), itemController.getItem);
router.put('/:id', requireRole(['owner']), validate(updateItemSchema), itemController.updateItem);

module.exports = router;
