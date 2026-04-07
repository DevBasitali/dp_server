const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const BRANCH_INCLUDE = {
  branch_links: {
    include: { branch: { select: { id: true, name: true } } },
  },
};

exports.listVendors = async (requestingUser) => {
  const where = { is_active: true };

  if (requestingUser.role === 'branch_manager' && requestingUser.branchId) {
    where.branch_links = { some: { branch_id: requestingUser.branchId } };
  }

  return prisma.vendor.findMany({ where, include: BRANCH_INCLUDE });
};

exports.createVendor = async ({ name, phone, whatsapp_number, category, notes, branch_ids }) => {
  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: { name, phone, whatsapp_number, category, notes },
    });

    if (Array.isArray(branch_ids) && branch_ids.length > 0) {
      await tx.vendorBranchLink.createMany({
        data: branch_ids.map((bId) => ({ vendor_id: vendor.id, branch_id: bId })),
      });
    }

    return vendor;
  });
};

exports.getVendor = async (vendorId, requestingUser) => {
  if (requestingUser.role === 'vendor' && requestingUser.vendorId !== vendorId) {
    throw new AppError('Access denied to other vendor profiles', 403);
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: BRANCH_INCLUDE,
  });

  if (!vendor) throw new AppError('Vendor not found', 404);
  return vendor;
};

exports.updateVendor = async (id, data) => {
  const exists = await prisma.vendor.findUnique({ where: { id } });
  if (!exists) throw new AppError('Vendor not found', 404);

  return prisma.vendor.update({ where: { id }, data });
};

exports.deactivateVendor = async (id) => {
  const exists = await prisma.vendor.findUnique({ where: { id } });
  if (!exists) throw new AppError('Vendor not found', 404);

  await prisma.vendor.update({ where: { id }, data: { is_active: false } });
};

// Stubs — to be implemented when Purchase/Item modules are built
exports.getVendorLedger = async (vendorId) => {
  return [];
};

exports.getVendorItems = async (vendorId) => {
  return [];
};
