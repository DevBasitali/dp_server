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
  const [
    totalOwners,
    pendingApprovals,
    totalBranches,
    totalVendors,
    totalUsers,
    totalVendorOrders,
    totalDailyClosings,
    pendingOwners,
    recentOwners,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'owner' } }),
    prisma.user.count({ where: { role: 'owner', accountStatus: 'PENDING' } }),
    prisma.branch.count(),
    prisma.vendor.count(),
    prisma.user.count({ where: { role: { in: ['branch_manager', 'vendor'] } } }),
    prisma.vendorOrder.count(),
    prisma.dailyClosing.count(),
    prisma.user.findMany({
      where: { role: 'owner', accountStatus: 'PENDING' },
      select: OWNER_SAFE_SELECT,
      orderBy: { created_at: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'owner', accountStatus: 'APPROVED' },
      select: OWNER_SAFE_SELECT,
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
  ]);

  return {
    stats: {
      totalOwners,
      pendingApprovals,
      totalBranches,
      totalVendors,
      totalUsers,
      totalVendorOrders,
      totalDailyClosings,
    },
    pendingOwners,
    recentOwners,
  };
};

exports.listOwners = async (status) => {
  const where = { role: 'owner' };
  if (status) where.accountStatus = status;

  const owners = await prisma.user.findMany({
    where,
    select: { ...OWNER_SAFE_SELECT },
    orderBy: { created_at: 'desc' },
  });

  const ownerIds = owners.map(o => o.id);

  const [branchCounts, userCounts, vendorCounts] = await Promise.all([
    prisma.branch.groupBy({ by: ['ownerId'], where: { ownerId: { in: ownerIds } }, _count: { id: true } }),
    prisma.user.groupBy({ by: ['createdBy'], where: { createdBy: { in: ownerIds } }, _count: { id: true } }),
    prisma.vendor.groupBy({ by: ['ownerId'], where: { ownerId: { in: ownerIds } }, _count: { id: true } }),
  ]);

  const branchMap = new Map(branchCounts.map(r => [r.ownerId, r._count.id]));
  const userMap = new Map(userCounts.map(r => [r.createdBy, r._count.id]));
  const vendorMap = new Map(vendorCounts.map(r => [r.ownerId, r._count.id]));

  return owners.map(o => ({
    ...o,
    branchCount: branchMap.get(o.id) || 0,
    userCount: userMap.get(o.id) || 0,
    vendorCount: vendorMap.get(o.id) || 0,
  }));
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
