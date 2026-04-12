const itemService = require('../services/item.service');

exports.listItems = async (req, res, next) => {
  try {
    const items = await itemService.listItems(req.query, req.user);
    res.json({ success: true, data: items, message: 'Items retrieved successfully' });
  } catch (err) {
    next(err);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    const item = await itemService.createItem(req.body, req.user);
    res.status(201).json({ success: true, data: item, message: 'Item created' });
  } catch (err) {
    next(err);
  }
};

exports.getItem = async (req, res, next) => {
  try {
    const item = await itemService.getItem(req.params.id, req.user);
    res.json({ success: true, data: item, message: 'Item found' });
  } catch (err) {
    next(err);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const item = await itemService.updateItem(req.params.id, req.body, req.user);
    res.json({ success: true, data: item, message: 'Item updated' });
  } catch (err) {
    next(err);
  }
};
