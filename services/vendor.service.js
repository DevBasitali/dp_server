const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const BRANCH_INCLUDE = {
  branch_links: {
    include: { branch: { select: { id: true, name: true } } },
  },
};

exports.listVendors = async (requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const where = { is_active: true, ...ownerFilter };

  if (requestingUser.role === 'branch_manager' && requestingUser.branchId) {
    where.branch_links = { some: { branch_id: requestingUser.branchId } };
  }

  return prisma.vendor.findMany({ where, include: BRANCH_INCLUDE });
};

exports.createVendor = async ({ name, phone, whatsapp_number, category, notes, branch_ids }, requestingUser) => {
  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: { name, phone, whatsapp_number, category, notes, ownerId: requestingUser.userId },
    });

    if (Array.isArray(branch_ids) && branch_ids.length > 0) {
      await tx.vendorBranchLink.createMany({
        data: branch_ids.map((bId) => ({ vendor_id: vendor.id, branch_id: bId, ownerId: requestingUser.userId })),
      });
    }

    return vendor;
  });
};

exports.getVendor = async (vendorId, requestingUser) => {
  if (requestingUser.role === 'vendor' && requestingUser.vendorId !== vendorId) {
    throw new AppError('Access denied to other vendor profiles', 403);
  }

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId, ...ownerFilter },
    include: BRANCH_INCLUDE,
  });

  if (!vendor) throw new AppError('Vendor not found', 404);
  return vendor;
};

exports.updateVendor = async (id, { branch_ids, ...vendorData }, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const exists = await prisma.vendor.findUnique({ where: { id, ...ownerFilter } });
  if (!exists) throw new AppError('Vendor not found', 404);

  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.update({ where: { id }, data: vendorData });

    if (Array.isArray(branch_ids)) {
      await tx.vendorBranchLink.deleteMany({ where: { vendor_id: id } });
      if (branch_ids.length > 0) {
        await tx.vendorBranchLink.createMany({
          data: branch_ids.map((bId) => ({ vendor_id: id, branch_id: bId, ownerId: requestingUser.ownerId })),
        });
      }
    }

    return vendor;
  });
};

exports.deactivateVendor = async (id, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const exists = await prisma.vendor.findUnique({ where: { id, ...ownerFilter } });
  if (!exists) throw new AppError('Vendor not found', 404);

  await prisma.vendor.update({ where: { id }, data: { is_active: false } });
};

// Stub — to be implemented when Purchase module is built
exports.getVendorLedger = async (vendorId) => {
  return [];
};

exports.getVendorItems = require('./item.service').listItemsByVendor;
