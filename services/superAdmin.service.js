const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const OWNER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  accountStatus: true,
  is_active: true,
  created_at: true,
};

exports.getDashboard = async () => {
  const [totalOwners, pendingApprovals, bannedOwners, activeOwners, pendingOwners] =
    await Promise.all([
      prisma.user.count({ where: { role: 'owner' } }),
      prisma.user.count({ where: { role: 'owner', accountStatus: 'PENDING' } }),
      prisma.user.count({ where: { role: 'owner', accountStatus: 'BANNED' } }),
      prisma.user.count({ where: { role: 'owner', accountStatus: 'APPROVED', is_active: true } }),
      prisma.user.findMany({
        where: { role: 'owner', accountStatus: 'PENDING' },
        select: { id: true, name: true, email: true, created_at: true },
        orderBy: { created_at: 'asc' },
      }),
    ]);

  return {
    stats: { totalOwners, pendingApprovals, bannedOwners, activeOwners },
    pendingOwners,
  };
};

exports.listOwners = async (status) => {
  const where = { role: 'owner' };
  if (status) where.accountStatus = status;

  return prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, accountStatus: true, is_active: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });
};

exports.createOwner = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const password_hash = await bcrypt.hash(password, 10);

  const owner = await prisma.user.create({
    data: {
      name,
      email,
      password_hash,
      role: 'owner',
      accountStatus: 'APPROVED',
      branch_id: null,
      vendor_id: null,
      createdBy: null,
      is_active: true,
    },
    select: OWNER_SAFE_SELECT,
  });

  return owner;
};

exports.approveOwner = async (id) => {
  const owner = await prisma.user.findUnique({ where: { id } });
  if (!owner || owner.role !== 'owner') throw new AppError('Owner not found', 404);
  if (owner.accountStatus === 'APPROVED') throw new AppError('Owner is already approved', 400);

  return prisma.user.update({
    where: { id },
    data: { accountStatus: 'APPROVED', is_active: true },
    select: OWNER_SAFE_SELECT,
  });
};

exports.banOwner = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'super_admin') throw new AppError('Cannot ban a super admin', 400);

  return prisma.user.update({
    where: { id },
    data: { accountStatus: 'BANNED', is_active: false },
    select: OWNER_SAFE_SELECT,
  });
};

exports.unbanOwner = async (id) => {
  const owner = await prisma.user.findUnique({ where: { id } });
  if (!owner || owner.role !== 'owner') throw new AppError('Owner not found', 404);

  return prisma.user.update({
    where: { id },
    data: { accountStatus: 'APPROVED', is_active: true },
    select: OWNER_SAFE_SELECT,
  });
};

exports.createSuperAdmin = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const password_hash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      name,
      email,
      password_hash,
      role: 'super_admin',
      accountStatus: 'APPROVED',
      branch_id: null,
      vendor_id: null,
      createdBy: null,
      is_active: true,
    },
    select: OWNER_SAFE_SELECT,
  });
};

exports.getOwnerData = async (id) => {
  const owner = await prisma.user.findUnique({
    where: { id },
    select: OWNER_SAFE_SELECT,
  });
  if (!owner || owner.role !== 'owner') throw new AppError('Owner not found', 404);

  const [branches, vendors, users, recentDailyClosings] = await Promise.all([
    prisma.branch.findMany({
      where: { ownerId: id },
      select: { id: true, name: true, location: true, is_active: true, created_at: true },
    }),
    prisma.vendor.findMany({
      where: { ownerId: id },
      select: { id: true, name: true, category: true, is_active: true, created_at: true },
    }),
    prisma.user.findMany({
      where: { createdBy: id },
      select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true },
    }),
    prisma.dailyClosing.findMany({
      where: { ownerId: id },
      select: {
        id: true, branchId: true, closingDate: true, totalSales: true,
        cashSales: true, easypaisaSales: true, createdAt: true,
        branch: { select: { name: true } },
      },
      orderBy: { closingDate: 'desc' },
      take: 10,
    }),
  ]);

  // Vendor outstanding
  const [inventoryTotals, paymentTotals] = await Promise.all([
    prisma.vendorInventory.groupBy({ by: ['vendorId'], where: { ownerId: id }, _sum: { amount: true } }),
    prisma.vendorPayment.groupBy({ by: ['vendorId'], where: { ownerId: id }, _sum: { amount: true } }),
  ]);

  const invMap = new Map(inventoryTotals.map(r => [r.vendorId, Number(r._sum.amount || 0)]));
  const payMap = new Map(paymentTotals.map(r => [r.vendorId, Number(r._sum.amount || 0)]));
  const allVendorIds = [...new Set([...invMap.keys(), ...payMap.keys()])];

  let vendorOutstanding = [];
  if (allVendorIds.length > 0) {
    const vendorNames = await prisma.vendor.findMany({
      where: { id: { in: allVendorIds }, ownerId: id },
      select: { id: true, name: true, category: true },
    });
    vendorOutstanding = vendorNames
      .map(v => ({
        vendorId: v.id,
        vendorName: v.name,
        category: v.category,
        totalInventory: invMap.get(v.id) || 0,
        totalPaid: payMap.get(v.id) || 0,
        outstandingBalance: (invMap.get(v.id) || 0) - (payMap.get(v.id) || 0),
      }))
      .filter(v => v.outstandingBalance > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  }

  return { owner, branches, vendors, users, recentDailyClosings, vendorOutstanding };
};
