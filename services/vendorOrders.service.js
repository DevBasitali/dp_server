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
  items: {
    select: { id: true, item_name: true, quantity: true, image_url: true, created_at: true },
  },
};

/**
 * Parse items from multipart body.
 * Client sends items as a JSON string in field "items".
 * Returns array of { itemName, quantity }.
 */
function parseItems(body) {
  if (!body.items) return [];
  if (Array.isArray(body.items)) return body.items;
  try {
    return JSON.parse(body.items);
  } catch {
    return [];
  }
}

/**
 * Extract the file buffer for a given item index from multer's req.files array.
 */
function getItemFile(files, index) {
  if (!Array.isArray(files)) return null;
  return files.find((f) => f.fieldname === `items[${index}][image]`) || null;
}

exports.createOrder = async ({ body, files, requestingUser }) => {
  const { vendorId, notes } = body;
  let { branchId } = body;

  // branch_manager: enforce own branchId
  if (requestingUser.role === 'branch_manager') {
    if (branchId && branchId !== requestingUser.branchId) {
      throw new AppError('branch_manager can only create orders for their own branch', 403);
    }
    branchId = requestingUser.branchId;
  }

  if (!branchId) throw new AppError('branchId is required', 400);
  if (!vendorId) throw new AppError('vendorId is required', 400);

  // Validate items
  const rawItems = parseItems(body);
  if (!rawItems.length) throw new AppError('At least one item is required', 400);

  for (let i = 0; i < rawItems.length; i++) {
    const it = rawItems[i];
    if (!it.itemName) throw new AppError(`Item ${i + 1}: itemName is required`, 400);
    const qty = parseInt(it.quantity, 10);
    if (!qty || qty < 1) throw new AppError(`Item ${i + 1}: quantity must be a positive integer`, 400);
  }

  // Verify vendor and branch exist
  const [vendor, branch] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId } }),
    prisma.branch.findUnique({ where: { id: branchId } }),
  ]);

  if (!vendor) throw new AppError('Vendor not found', 404);
  if (!branch) throw new AppError('Branch not found', 404);

  // Upload item images to Cloudinary
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

  // Create order + items atomically
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.vendorOrder.create({
      data: {
        branch_id: branchId,
        vendor_id: vendorId,
        requested_by: requestingUser.userId,
        notes: notes || null,
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

  // Fetch requester info for PDF/WhatsApp
  const requester = await prisma.user.findUnique({
    where: { id: requestingUser.userId },
    select: { id: true, name: true },
  });

  // Generate PDF
  let pdfUrl = null;
  try {
    const pdfBuffer = await pdfService.generateOrderPDF({
      order,
      vendor,
      branch,
      requester,
      items: order.items,
    });
    pdfUrl = await cloudinaryService.uploadPDF(pdfBuffer, 'vendor-orders/pdfs');
  } catch (err) {
    console.error('PDF generation/upload failed:', err.message);
  }

  // Send WhatsApp notifications
  let whatsappSent = false;
  let whatsappSentAt = null;

  if (pdfUrl) {
    try {
      await whatsappService.sendOrderNotifications({
        order,
        vendor,
        branch,
        requester,
        items: order.items,
        pdfUrl,
      });
      whatsappSent = true;
      whatsappSentAt = new Date();
    } catch (err) {
      console.error('WhatsApp notification failed:', err.message);
    }
  }

  // Update order with pdfUrl + whatsapp status
  const updatedOrder = await prisma.vendorOrder.update({
    where: { id: order.id },
    data: { pdf_url: pdfUrl, whatsapp_sent: whatsappSent, whatsapp_sent_at: whatsappSentAt },
    select: ORDER_SELECT,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      user_id: requestingUser.userId,
      action: 'ORDER_SENT',
      entity_type: 'vendor_order',
      entity_id: order.id,
      description: `Order sent to vendor ${vendor.name} for branch ${branch.name}`,
    },
  });

  return updatedOrder;
};

exports.listOrders = async ({ requestingUser, query }) => {
  const where = {};

  if (requestingUser.role === 'branch_manager') {
    where.branch_id = requestingUser.branchId;
  }

  if (query.vendorId) {
    where.vendor_id = query.vendorId;
  }

  if (query.branchId && requestingUser.role === 'owner') {
    where.branch_id = query.branchId;
  }

  return prisma.vendorOrder.findMany({
    where,
    select: ORDER_SELECT,
    orderBy: { created_at: 'desc' },
  });
};

exports.getOrder = async (orderId, requestingUser) => {
  const order = await prisma.vendorOrder.findUnique({
    where: { id: orderId },
    select: ORDER_SELECT,
  });

  if (!order) throw new AppError('Order not found', 404);

  if (requestingUser.role === 'vendor') {
    if (order.vendor_id !== requestingUser.vendorId) {
      throw new AppError('Access denied', 403);
    }
  }

  if (requestingUser.role === 'branch_manager') {
    if (order.branch_id !== requestingUser.branchId) {
      throw new AppError('Access denied', 403);
    }
  }

  return order;
};

exports.listOrdersByVendor = async (vendorId, requestingUser) => {
  if (requestingUser.role === 'vendor' && requestingUser.vendorId !== vendorId) {
    throw new AppError('Access denied', 403);
  }

  return prisma.vendorOrder.findMany({
    where: { vendor_id: vendorId },
    select: ORDER_SELECT,
    orderBy: { created_at: 'desc' },
  });
};
