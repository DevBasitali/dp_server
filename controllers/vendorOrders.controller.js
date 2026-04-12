const vendorOrdersService = require('../services/vendorOrders.service');

exports.createOrder = async (req, res, next) => {
  try {
    const order = await vendorOrdersService.createOrder({
      body: req.body,
      files: req.files,
      requestingUser: req.user,
    });
    res.status(201).json({ success: true, data: order, message: 'Vendor order created and sent' });
  } catch (err) {
    next(err);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const order = await vendorOrdersService.updateOrder({
      id: req.params.id,
      body: req.body,
      files: req.files,
      requestingUser: req.user,
    });
    res.json({ success: true, data: order, message: 'Vendor order updated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.listOrders = async (req, res, next) => {
  try {
    const orders = await vendorOrdersService.listOrders({
      requestingUser: req.user,
      query: req.query,
    });
    res.json({ success: true, data: orders, message: 'Orders retrieved successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await vendorOrdersService.getOrder(req.params.id, req.user);
    res.json({ success: true, data: order, message: 'Order retrieved successfully' });
  } catch (err) {
    next(err);
  }
};

exports.downloadOrderPDF = async (req, res, next) => {
  try {
    await vendorOrdersService.downloadOrderPDF(req.params.id, req.user, res);
  } catch (err) {
    next(err);
  }
};

exports.listOrdersByVendor = async (req, res, next) => {
  try {
    const orders = await vendorOrdersService.listOrdersByVendor(req.params.id, req.user);
    res.json({ success: true, data: orders, message: 'Vendor orders retrieved successfully' });
  } catch (err) {
    next(err);
  }
};
