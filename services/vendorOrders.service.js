const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');
const cloudinaryService = require('./cloudinary.service');
const pdfService = require('./pdf.service');
const whatsappService = require('./whatsapp.service');

const ORDER_SELECT = {
  id: true,
  branch_id: true,
  vendor_id: true,
  requested_by: true,
  notes: true,
  pdf_url: true,
  whatsapp_sent: true,
  whatsapp_sent_at: true,
  created_at: true,
  branch: {
    select: { id: true, name: true },
  },
  vendor: {
    select: { id: true, name: true },
  },
  items: {
    select: { id: true, item_name: true, quantity: true, image_url: true, created_at: true },
  },
};

function parseItems(body) {
  if (!body.items) return [];
  if (Array.isArray(body.items)) return body.items;
  try {
    return JSON.parse(body.items);
  } catch {
    return [];
  }
}

function getItemFile(files, index) {
  if (!Array.isArray(files)) return null;
  return files.find((f) => f.fieldname === `items[${index}][image]`) || null;
}

exports.createOrder = async ({ body, files, requestingUser }) => {
  const { vendorId, notes } = body;
  let { branchId } = body;

  if (requestingUser.role === 'branch_manager') {
    if (branchId && branchId !== requestingUser.branchId) {
      throw new AppError('branch_manager can only create orders for their own branch', 403);
    }
    branchId = requestingUser.branchId;
  }

  if (!branchId) throw new AppError('branchId is required', 400);
  if (!vendorId) throw new AppError('vendorId is required', 400);

  const rawItems = parseItems(body);
  if (!rawItems.length) throw new AppError('At least one item is required', 400);

  for (let i = 0; i < rawItems.length; i++) {
    const it = rawItems[i];
    if (!it.itemName) throw new AppError(`Item ${i + 1}: itemName is required`, 400);
    const qty = parseInt(it.quantity, 10);
    if (!qty || qty < 1) throw new AppError(`Item ${i + 1}: quantity must be a positive integer`, 400);
  }

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const [vendor, branch] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId, ...ownerFilter } }),
    prisma.branch.findUnique({ where: { id: branchId, ...ownerFilter } }),
  ]);

  if (!vendor) throw new AppError('Vendor not found', 404);
  if (!branch) throw new AppError('Branch not found', 404);

  const itemImageUrls = await Promise.all(
    rawItems.map(async (_, i) => {
      const file = getItemFile(files, i);
      if (!file) return null;
      try {
        return await cloudinaryService.uploadImage(file.buffer, 'vendor-orders/items');
      } catch (err) {
        console.error(`Image upload failed for item ${i + 1}:`, err.message);
        return null;
      }
    })
  );

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.vendorOrder.create({
      data: {
        branch_id: branchId,
        vendor_id: vendorId,
        requested_by: requestingUser.userId,
        notes: notes || null,
        ownerId: requestingUser.ownerId,
        items: {
          create: rawItems.map((it, i) => ({
            item_name: it.itemName,
            quantity: parseInt(it.quantity, 10),
            image_url: itemImageUrls[i] || null,
          })),
        },
      },
      select: ORDER_SELECT,
    });
    return created;
  });

  const requester = await prisma.user.findUnique({
    where: { id: requestingUser.userId },
    select: { id: true, name: true },
  });

  let pdfUrl = null;
  try {
    const pdfBuffer = await pdfService.generateOrderPDF({ order, vendor, branch, requester, items: order.items });
    pdfUrl = await cloudinaryService.uploadPDF(pdfBuffer, 'vendor-orders/pdfs', `Order_${order.id}`);
  } catch (err) {
    console.error('PDF generation/upload failed:', err.message);
  }

  let whatsappSent = false;
  let whatsappSentAt = null;

  if (pdfUrl) {
    try {
      await whatsappService.sendOrderNotifications({ order, vendor, branch, requester, items: order.items, pdfUrl });
      whatsappSent = true;
      whatsappSentAt = new Date();
    } catch (err) {
      console.error('WhatsApp notification failed:', err.message);
    }
  }

  const updatedOrder = await prisma.vendorOrder.update({
    where: { id: order.id },
    data: { pdf_url: pdfUrl, whatsapp_sent: whatsappSent, whatsapp_sent_at: whatsappSentAt },
    select: ORDER_SELECT,
  });

  await prisma.auditLog.create({
    data: {
      user_id: requestingUser.userId,
      action: 'ORDER_SENT',
      entity_type: 'vendor_order',
      entity_id: order.id,
      description: `Order sent to vendor ${vendor.name} for branch ${branch.name}`,
      ownerId: requestingUser.ownerId,
    },
  });

  return updatedOrder;
};

exports.updateOrder = async ({ id, body, files, requestingUser }) => {
  const { vendorId, notes } = body;
  let { branchId } = body;

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  
  const existingOrder = await prisma.vendorOrder.findUnique({
    where: { id, ...ownerFilter },
    include: { items: true, vendor: true, branch: true }
  });

  if (!existingOrder) throw new AppError('Order not found', 404);

  if (requestingUser.role === 'branch_manager') {
    if (existingOrder.branch_id !== requestingUser.branchId) throw new AppError('Access denied', 403);
    if (branchId && branchId !== requestingUser.branchId) throw new AppError('branch_manager can only use their own branch', 403);
    branchId = requestingUser.branchId;
  }
  
  // enforce time limit
  const limitHours = parseInt(process.env.ORDER_EDIT_TIME_LIMIT_HOURS || '5', 10);
  const hoursSinceCreation = Math.abs(new Date() - existingOrder.created_at) / 36e5;
  if (hoursSinceCreation > limitHours) {
    throw new AppError(`Orders cannot be edited after ${limitHours} hours.`, 403);
  }

  branchId = branchId || existingOrder.branch_id;
  const targetVendorId = vendorId || existingOrder.vendor_id;

  const rawItems = parseItems(body);
  if (!rawItems.length) throw new AppError('At least one item is required', 400);

  for (let i = 0; i < rawItems.length; i++) {
    const it = rawItems[i];
    if (!it.itemName) throw new AppError(`Item ${i + 1}: itemName is required`, 400);
    const qty = parseInt(it.quantity, 10);
    if (!qty || qty < 1) throw new AppError(`Item ${i + 1}: quantity must be a positive integer`, 400);
  }

  const [vendor, branch] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: targetVendorId, ...ownerFilter } }),
    prisma.branch.findUnique({ where: { id: branchId, ...ownerFilter } }),
  ]);

  if (!vendor) throw new AppError('Vendor not found', 404);
  if (!branch) throw new AppError('Branch not found', 404);

  const itemsToKeepIds = rawItems.filter(it => it.id).map(it => it.id);
  const itemsToDelete = existingOrder.items.filter(it => !itemsToKeepIds.includes(it.id));
  
  // Cleanup Cloudinary images for deleted items
  itemsToDelete.forEach(it => {
    if (it.image_url) cloudinaryService.deleteFile(it.image_url, 'image').catch(console.error);
  });

  const updatedItemsData = await Promise.all(
    rawItems.map(async (it, i) => {
      let image_url = it.image_url || null;
      const file = getItemFile(files, i);
      if (file) {
        try {
          if (image_url) {
            cloudinaryService.deleteFile(image_url, 'image').catch(console.error);
          }
          image_url = await cloudinaryService.uploadImage(file.buffer, 'vendor-orders/items');
        } catch (err) {
          console.error(`Image upload failed for item ${i + 1}:`, err.message);
        }
      }
      return {
        id: it.id,
        item_name: it.itemName,
        quantity: parseInt(it.quantity, 10),
        image_url
      };
    })
  );

  const updatedOrder = await prisma.$transaction(async (tx) => {
    if (itemsToDelete.length > 0) {
      await tx.vendorOrderItem.deleteMany({
        where: { id: { in: itemsToDelete.map(i => i.id) } },
      });
    }

    for (const item of updatedItemsData) {
      if (item.id) {
        await tx.vendorOrderItem.update({
          where: { id: item.id },
          data: {
            item_name: item.item_name,
            quantity: item.quantity,
            image_url: item.image_url
          }
        });
      } else {
        await tx.vendorOrderItem.create({
          data: {
            order_id: existingOrder.id,
            item_name: item.item_name,
            quantity: item.quantity,
            image_url: item.image_url
          }
        });
      }
    }

    const updated = await tx.vendorOrder.update({
      where: { id: existingOrder.id },
      data: {
        branch_id: branchId,
        vendor_id: targetVendorId,
        notes: notes !== undefined ? notes : existingOrder.notes,
      },
      select: ORDER_SELECT,
    });
    return updated;
  });

  const requester = await prisma.user.findUnique({
    where: { id: requestingUser.userId },
    select: { id: true, name: true },
  });

  let newPdfUrl = existingOrder.pdf_url;
  try {
    const pdfBuffer = await pdfService.generateOrderPDF({ order: updatedOrder, vendor, branch, requester, items: updatedOrder.items });
    
    if (existingOrder.pdf_url) {
      cloudinaryService.deleteFile(existingOrder.pdf_url, 'raw').catch(console.error);
    }
    newPdfUrl = await cloudinaryService.uploadPDF(pdfBuffer, 'vendor-orders/pdfs', `Order_${updatedOrder.id}`);
  } catch (err) {
    console.error('PDF generation/upload failed:', err.message);
  }

  let whatsappSent = false;
  let whatsappSentAt = existingOrder.whatsapp_sent_at;

  if (newPdfUrl) {
    try {
      await whatsappService.sendOrderNotifications({ order: updatedOrder, vendor, branch, requester, items: updatedOrder.items, pdfUrl: newPdfUrl });
      whatsappSent = true;
      whatsappSentAt = new Date();
    } catch (err) {
      console.error('WhatsApp notification failed:', err.message);
    }
  }

  const finalOrder = await prisma.vendorOrder.update({
    where: { id: updatedOrder.id },
    data: { pdf_url: newPdfUrl, whatsapp_sent: whatsappSent, whatsapp_sent_at: whatsappSentAt },
    select: ORDER_SELECT,
  });

  await prisma.auditLog.create({
    data: {
      user_id: requestingUser.userId,
      action: 'ORDER_EDITED',
      entity_type: 'vendor_order',
      entity_id: updatedOrder.id,
      description: `Order updated and resent to vendor ${vendor.name} for branch ${branch.name}`,
      ownerId: requestingUser.ownerId,
    },
  });

  return finalOrder;
};

exports.downloadOrderPDF = async (id, requestingUser, res) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const order = await prisma.vendorOrder.findUnique({
    where: { id, ...ownerFilter },
    select: { id: true, pdf_url: true, branch_id: true, vendor_id: true },
  });

  if (!order) throw new AppError('Order not found', 404);
  if (!order.pdf_url) throw new AppError('PDF not generated yet', 400);

  if (requestingUser.role === 'vendor' && order.vendor_id !== requestingUser.vendorId) {
    throw new AppError('Access denied', 403);
  }
  if (requestingUser.role === 'branch_manager' && order.branch_id !== requestingUser.branchId) {
    throw new AppError('Access denied', 403);
  }

  try {
    const response = await fetch(order.pdf_url);
    if (!response.ok) {
      return res.status(500).json({ success: false, message: `Failed to fetch PDF from storage (Status: ${response.status})` });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Order_${order.id}.pdf"`);

    const { Readable } = require('stream');
    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error('Download Proxy Error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error during download' });
  }
};

exports.listOrders = async ({ requestingUser, query }) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const where = { ...ownerFilter };

  if (requestingUser.role === 'branch_manager') {
    where.branch_id = requestingUser.branchId;
  }

  if (query.vendorId) {
    where.vendor_id = query.vendorId;
  }

  if (query.branchId && (requestingUser.role === 'owner' || requestingUser.isSuperAdmin)) {
    where.branch_id = query.branchId;
  }

  return prisma.vendorOrder.findMany({
    where,
    select: ORDER_SELECT,
    orderBy: { created_at: 'desc' },
  });
};

exports.getOrder = async (orderId, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const order = await prisma.vendorOrder.findUnique({
    where: { id: orderId, ...ownerFilter },
    select: ORDER_SELECT,
  });

  if (!order) throw new AppError('Order not found', 404);

  if (requestingUser.role === 'vendor' && order.vendor_id !== requestingUser.vendorId) {
    throw new AppError('Access denied', 403);
  }

  if (requestingUser.role === 'branch_manager' && order.branch_id !== requestingUser.branchId) {
    throw new AppError('Access denied', 403);
  }

  return order;
};

exports.listOrdersByVendor = async (vendorId, requestingUser) => {
  if (requestingUser.role === 'vendor' && requestingUser.vendorId !== vendorId) {
    throw new AppError('Access denied', 403);
  }

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  return prisma.vendorOrder.findMany({
    where: { vendor_id: vendorId, ...ownerFilter },
    select: ORDER_SELECT,
    orderBy: { created_at: 'desc' },
  });
};
