const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const SAFE_SELECT = {
  id: true,
  name: true,
  category: true,
  vendor_id: true,
  cost_price: true,
  selling_price: true,
  margin: true,
  margin_percent: true,
  is_active: true,
  created_at: true,
};

function calcMargins(cost_price, selling_price) {
  const margin = parseFloat((selling_price - cost_price).toFixed(2));
  const margin_percent = parseFloat((((selling_price - cost_price) / cost_price) * 100).toFixed(2));
  return { margin, margin_percent };
}

exports.createItem = async ({ name, category, vendor_id, cost_price, selling_price }, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const vendor = await prisma.vendor.findUnique({ where: { id: vendor_id, ...ownerFilter } });
  if (!vendor) throw new AppError('Vendor not found', 404);

  const { margin, margin_percent } = calcMargins(cost_price, selling_price);

  return prisma.$transaction(async (tx) => {
    const item = await tx.item.create({
      data: { name, category, vendor_id, cost_price, selling_price, margin, margin_percent, ownerId: requestingUser.ownerId },
      select: SAFE_SELECT,
    });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'CREATE_ITEM',
        entity_type: 'Item',
        entity_id: item.id,
        description: `Created item "${name}" for vendor ${vendor_id}`,
        ownerId: requestingUser.ownerId,
      },
    });

    return item;
  });
};

exports.listItems = async ({ vendor_id, category } = {}, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const where = { is_active: true, ...ownerFilter };
  if (vendor_id) where.vendor_id = vendor_id;
  if (category) where.category = category;

  return prisma.item.findMany({ where, select: SAFE_SELECT });
};

exports.getItem = async (id, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const item = await prisma.item.findUnique({ where: { id, ...ownerFilter }, select: SAFE_SELECT });
  if (!item) throw new AppError('Item not found', 404);
  return item;
};

exports.updateItem = async (id, { name, category, cost_price, selling_price, is_active }, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const existing = await prisma.item.findUnique({ where: { id, ...ownerFilter } });
  if (!existing) throw new AppError('Item not found', 404);

  const newCost = cost_price !== undefined ? cost_price : Number(existing.cost_price);
  const newSelling = selling_price !== undefined ? selling_price : Number(existing.selling_price);
  const { margin, margin_percent } = calcMargins(newCost, newSelling);

  const data = { margin, margin_percent };
  if (name !== undefined) data.name = name;
  if (category !== undefined) data.category = category;
  if (cost_price !== undefined) data.cost_price = cost_price;
  if (selling_price !== undefined) data.selling_price = selling_price;
  if (is_active !== undefined) data.is_active = is_active;

  return prisma.$transaction(async (tx) => {
    const item = await tx.item.update({ where: { id }, data, select: SAFE_SELECT });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'UPDATE_ITEM',
        entity_type: 'Item',
        entity_id: id,
        description: `Updated item "${item.name}"`,
        ownerId: requestingUser.ownerId,
      },
    });

    return item;
  });
};

exports.listItemsByVendor = async (vendorId, requestingUser) => {
  if (requestingUser.role === 'vendor' && requestingUser.vendorId !== vendorId) {
    throw new AppError('Access denied to other vendor items', 403);
  }

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId, ...ownerFilter } });
  if (!vendor) throw new AppError('Vendor not found', 404);

  return prisma.item.findMany({
    where: { vendor_id: vendorId, is_active: true, ...ownerFilter },
    select: SAFE_SELECT,
  });
};
