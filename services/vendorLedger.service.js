const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

exports.getLedger = async ({ vendorId, requestingUser }) => {
  if (requestingUser.role === 'vendor' && requestingUser.vendorId !== vendorId) {
    throw new AppError('Access denied', 403);
  }

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const branchFilter = requestingUser.role === 'branch_manager' ? { branchId: requestingUser.branchId } : {};

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId, ...ownerFilter },
    select: { id: true, name: true, whatsapp_number: true, category: true },
  });
  if (!vendor) throw new AppError('Vendor not found', 404);

  const inventoryWhere = { vendorId, ...ownerFilter, ...branchFilter };
  const paymentWhere = { vendorId, ...ownerFilter, ...branchFilter };

  const [inventories, payments] = await Promise.all([
    prisma.vendorInventory.findMany({
      where: inventoryWhere,
      select: {
        id: true, date: true, description: true, amount: true, createdAt: true,
        branch: { select: { id: true, name: true } },
        recorder: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.vendorPayment.findMany({
      where: paymentWhere,
      select: {
        id: true, date: true, description: true, amount: true, source: true, createdAt: true,
        branch: { select: { id: true, name: true } },
        recorder: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const merged = [
    ...inventories.map(r => ({ ...r, type: 'INVENTORY', source: null })),
    ...payments.map(r => ({ ...r, type: 'PAYMENT' })),
  ].sort((a, b) => {
    const d = new Date(a.date) - new Date(b.date);
    return d !== 0 ? d : new Date(a.createdAt) - new Date(b.createdAt);
  });

  let runningBalance = 0;
  const ledger = merged.map(row => {
    const amount = Number(row.amount);
    runningBalance += row.type === 'INVENTORY' ? amount : -amount;
    return {
      date: row.date, type: row.type, description: row.description,
      amount, source: row.source, branch: row.branch,
      recordedBy: row.recorder, runningBalance,
    };
  });

  return {
    vendor: { id: vendor.id, name: vendor.name, whatsappNumber: vendor.whatsapp_number, category: vendor.category },
    outstandingBalance: runningBalance,
    ledger,
  };
};

exports.recordInventory = async ({ body, requestingUser }) => {
  let { vendorId, branchId, amount, description, date } = body;

  if (requestingUser.role === 'branch_manager') {
    if (branchId && branchId !== requestingUser.branchId) {
      throw new AppError('branch_manager can only record inventory for their own branch', 403);
    }
    branchId = requestingUser.branchId;
  }

  if (!branchId) throw new AppError('branchId is required', 400);

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId, ...ownerFilter } });
  if (!vendor) throw new AppError('Vendor not found', 404);

  const branch = await prisma.branch.findUnique({ where: { id: branchId, ...ownerFilter } });
  if (!branch) throw new AppError('Branch not found', 404);

  return prisma.$transaction(async (tx) => {
    const record = await tx.vendorInventory.create({
      data: {
        vendorId, branchId, amount, description,
        date: new Date(date),
        recordedBy: requestingUser.userId,
        ownerId: requestingUser.ownerId,
      },
      select: {
        id: true, vendorId: true, branchId: true, amount: true, description: true,
        date: true, createdAt: true,
        branch: { select: { id: true, name: true } },
        recorder: { select: { id: true, name: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'INVENTORY_RECORDED',
        entity_type: 'vendor_inventory',
        entity_id: record.id,
        description: `Inventory of Rs.${amount} recorded for vendor ${vendor.name} at branch ${branch.name}`,
        ownerId: requestingUser.ownerId,
      },
    });

    return record;
  });
};

exports.recordPayment = async ({ body, requestingUser }) => {
  let { vendorId, branchId, amount, source, description, date } = body;

  if (requestingUser.role === 'branch_manager') {
    if (branchId && branchId !== requestingUser.branchId) {
      throw new AppError('branch_manager can only record payments for their own branch', 403);
    }
    branchId = requestingUser.branchId;
  }

  if (!branchId) throw new AppError('branchId is required', 400);

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId, ...ownerFilter } });
  if (!vendor) throw new AppError('Vendor not found', 404);

  const branch = await prisma.branch.findUnique({ where: { id: branchId, ...ownerFilter } });
  if (!branch) throw new AppError('Branch not found', 404);

  return prisma.$transaction(async (tx) => {
    if (source === 'CAL') {
      const calBox = await tx.calBox.findUnique({ where: { branchId } });
      if (!calBox) throw new AppError('Cal Box not found for this branch', 404);
      if (Number(calBox.balance) < amount) throw new AppError('Insufficient Cal Box balance', 400);
      await tx.calBox.update({ where: { branchId }, data: { balance: Number(calBox.balance) - amount } });
    }

    const record = await tx.vendorPayment.create({
      data: {
        vendorId, branchId, amount, source, description,
        date: new Date(date),
        recordedBy: requestingUser.userId,
        ownerId: requestingUser.ownerId,
      },
      select: {
        id: true, vendorId: true, branchId: true, amount: true, source: true,
        description: true, date: true, createdAt: true,
        branch: { select: { id: true, name: true } },
        recorder: { select: { id: true, name: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'PAYMENT_RECORDED',
        entity_type: 'vendor_payment',
        entity_id: record.id,
        description: `Payment of Rs.${amount} (${source}) recorded for vendor ${vendor.name} at branch ${branch.name}`,
        ownerId: requestingUser.ownerId,
      },
    });

    return record;
  });
};

exports.getOutstanding = async (requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };

  const [inventoryTotals, paymentTotals] = await Promise.all([
    prisma.vendorInventory.groupBy({ by: ['vendorId'], where: ownerFilter, _sum: { amount: true } }),
    prisma.vendorPayment.groupBy({ by: ['vendorId'], where: ownerFilter, _sum: { amount: true } }),
  ]);

  const invMap = new Map(inventoryTotals.map(r => [r.vendorId, Number(r._sum.amount || 0)]));
  const payMap = new Map(paymentTotals.map(r => [r.vendorId, Number(r._sum.amount || 0)]));
  const allVendorIds = [...new Set([...invMap.keys(), ...payMap.keys()])];
  if (allVendorIds.length === 0) return [];

  const vendors = await prisma.vendor.findMany({
    where: { id: { in: allVendorIds }, ...ownerFilter },
    select: { id: true, name: true, category: true },
  });

  return vendors
    .map(v => {
      const totalInventory = invMap.get(v.id) || 0;
      const totalPaid = payMap.get(v.id) || 0;
      return { vendorId: v.id, vendorName: v.name, category: v.category, totalInventory, totalPaid, outstandingBalance: totalInventory - totalPaid };
    })
    .filter(v => v.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance);
};
