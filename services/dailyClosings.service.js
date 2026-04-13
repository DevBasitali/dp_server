const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const DAILY_CLOSING_SELECT = {
  id: true,
  branchId: true,
  closingDate: true,
  cashSales: true,
  easypaisaSales: true,
  totalSales: true,
  registerTotal: true,
  physicalToBox: true,
  notes: true,
  createdAt: true,
  branch: {
    select: { id: true, name: true },
  },
  enterer: {
    select: { id: true, name: true },
  },
  expenses: {
    select: { id: true, description: true, amount: true, source: true, vendorId: true, createdAt: true },
  },
};

exports.create = async ({ body, requestingUser }) => {
  const { cashSales, easypaisaSales, notes, expenses = [] } = body;
  let { branchId, closingDate } = body;

  if (requestingUser.role === 'branch_manager') {
    if (branchId && branchId !== requestingUser.branchId) {
      throw new AppError('branch_manager can only submit closings for their own branch', 403);
    }
    branchId = requestingUser.branchId;
  }

  if (!branchId) throw new AppError('branchId is required', 400);

  // Slice to date-only then force UTC midnight — prevents Pakistan timezone offset
  // from pushing the stored timestamp into the previous UTC day
  const dateStr = (closingDate ? String(closingDate).slice(0, 10) : new Date().toISOString().slice(0, 10));
  const parsedDate = new Date(dateStr + 'T00:00:00.000Z');

  if (cashSales < 0 || easypaisaSales < 0) throw new AppError('Values cannot be negative.', 400);

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const branch = await prisma.branch.findUnique({ where: { id: branchId, ...ownerFilter } });
  if (!branch) throw new AppError('Branch not found', 404);

  const month = parsedDate.getMonth() + 1;
  const year = parsedDate.getFullYear();
  const lockedMonth = await prisma.monthlyClosing.findUnique({
    where: { branchId_month_year: { branchId, month, year } },
    select: { isLocked: true },
  });
  if (lockedMonth && lockedMonth.isLocked) {
    throw new AppError('This month is already closed. No new entries allowed.', 409);
  }

  const existing = await prisma.dailyClosing.findUnique({
    where: { branchId_closingDate: { branchId, closingDate: parsedDate } },
  });
  if (existing) throw new AppError('A closing entry already exists for this date.', 409);

  const saleExpenses = expenses.filter(e => e.source === 'SALE').reduce((sum, e) => sum + e.amount, 0);
  const calExpenses = expenses.filter(e => e.source === 'CAL').reduce((sum, e) => sum + e.amount, 0);
  const totalSales = cashSales + easypaisaSales;
  const registerTotal = totalSales + saleExpenses;
  const physicalToBox = totalSales - saleExpenses;

  const closing = await prisma.$transaction(async (tx) => {
    const created = await tx.dailyClosing.create({
      data: {
        branchId,
        enteredBy: requestingUser.userId,
        closingDate: parsedDate,
        cashSales,
        easypaisaSales,
        totalSales,
        registerTotal,
        physicalToBox,
        notes: notes || null,
        ownerId: requestingUser.ownerId,
        expenses: {
          create: expenses.map(e => ({
            description: e.description,
            amount: e.amount,
            source: e.source,
            ownerId: requestingUser.ownerId,
            ...(e.vendorId ? { vendorId: e.vendorId } : {}),
          })),
        },
      },
      select: DAILY_CLOSING_SELECT,
    });

    const vendorExpenses = expenses.filter(e => e.vendorId);
    for (const e of vendorExpenses) {
      await tx.vendorPayment.create({
        data: {
          vendorId: e.vendorId,
          branchId,
          amount: e.amount,
          source: e.source,
          description: e.description,
          date: parsedDate,
          recordedBy: requestingUser.userId,
          ownerId: requestingUser.ownerId,
          closingId: created.id,
        },
      });
    }

    const calBox = await tx.calBox.upsert({
      where: { branchId },
      create: { branchId, balance: 0, ownerId: requestingUser.ownerId },
      update: {},
    });

    await tx.calBox.update({
      where: { branchId },
      data: { balance: Number(calBox.balance) + physicalToBox - calExpenses },
    });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'DAILY_CLOSING_ADDED',
        entity_type: 'daily_closing',
        entity_id: created.id,
        description: `Daily closing added for branch ${branch.name} on ${dateStr}`,
        ownerId: requestingUser.ownerId,
      },
    });

    return created;
  });

  return closing;
};

exports.list = async ({ requestingUser, query }) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const where = { ...ownerFilter };

  if (requestingUser.role === 'branch_manager') {
    where.branchId = requestingUser.branchId;
  } else if (query.branchId) {
    where.branchId = query.branchId;
  }

  if (query.month && query.year) {
    const month = parseInt(query.month, 10);
    const year = parseInt(query.year, 10);
    where.closingDate = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
  }

  return prisma.dailyClosing.findMany({
    where,
    select: {
      id: true,
      closingDate: true,
      cashSales: true,
      easypaisaSales: true,
      registerTotal: true,
      physicalToBox: true,
      notes: true,
      enteredBy: true,
      branch: {
        select: {
          id: true,
          name: true
        }
      },
      enterer: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { closingDate: 'desc' },
  });
};

exports.getSummary = async ({ requestingUser, query }) => {
  const { branchId, month, year } = query;

  if (!branchId) throw new AppError('branchId is required', 400);
  if (!month) throw new AppError('month is required', 400);
  if (!year) throw new AppError('year is required', 400);

  if (requestingUser.role === 'branch_manager' && branchId !== requestingUser.branchId) {
    throw new AppError('Access denied', 403);
  }

  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };

  const records = await prisma.dailyClosing.findMany({
    where: {
      branchId,
      ...ownerFilter,
      closingDate: { gte: new Date(yearNum, monthNum - 1, 1), lt: new Date(yearNum, monthNum, 1) },
    },
    select: {
      cashSales: true,
      easypaisaSales: true,
      totalSales: true,
      registerTotal: true,
      physicalToBox: true,
      expenses: { select: { amount: true, source: true } },
    },
  });

  const totalCashSales = records.reduce((sum, r) => sum + Number(r.cashSales), 0);
  const totalEasypaisaSales = records.reduce((sum, r) => sum + Number(r.easypaisaSales), 0);
  const totalSales = records.reduce((sum, r) => sum + Number(r.totalSales), 0);
  const totalRegister = records.reduce((sum, r) => sum + Number(r.registerTotal), 0);
  const totalPhysical = records.reduce((sum, r) => sum + Number(r.physicalToBox), 0);
  const allExpenses = records.flatMap(r => r.expenses);
  const totalSaleExpenses = allExpenses.filter(e => e.source === 'SALE').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalCalExpenses = allExpenses.filter(e => e.source === 'CAL').reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    branchId, month: monthNum, year: yearNum,
    daysRecorded: records.length,
    totalCashSales, totalEasypaisaSales, totalSales,
    totalSaleExpenses, totalCalExpenses,
    totalRegister, totalPhysical,
    netBachat: totalSales - totalSaleExpenses,
  };
};

exports.update = async ({ id, body, requestingUser }) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const closing = await prisma.dailyClosing.findUnique({
    where: { id, ...ownerFilter },
    select: { ...DAILY_CLOSING_SELECT, enteredBy: true, branchId: true },
  });

  if (!closing) throw new AppError('Daily closing not found', 404);

  if (requestingUser.role === 'branch_manager') {
    if (closing.enteredBy !== requestingUser.userId) {
      throw new AppError('You can only edit your own entries', 403);
    }
    const today = new Date().toISOString().slice(0, 10);
    if (new Date(closing.closingDate).toISOString().slice(0, 10) !== today) {
      throw new AppError('branch_manager can only edit entries for today', 403);
    }
  }

  const closingMonth = new Date(closing.closingDate).getMonth() + 1;
  const closingYear = new Date(closing.closingDate).getFullYear();
  const lockedMonth = await prisma.monthlyClosing.findUnique({
    where: { branchId_month_year: { branchId: closing.branchId, month: closingMonth, year: closingYear } },
    select: { isLocked: true },
  });
  if (lockedMonth && lockedMonth.isLocked) {
    throw new AppError('This month is already closed. No new entries allowed.', 409);
  }

  const cashSales = body.cashSales !== undefined ? body.cashSales : Number(closing.cashSales);
  const easypaisaSales = body.easypaisaSales !== undefined ? body.easypaisaSales : Number(closing.easypaisaSales);
  const expenses = body.expenses !== undefined ? body.expenses : closing.expenses.map(e => ({
    description: e.description, amount: Number(e.amount), source: e.source, vendorId: e.vendorId || null,
  }));

  if (cashSales < 0 || easypaisaSales < 0) throw new AppError('Values cannot be negative.', 400);

  const oldCalExpenses = closing.expenses.filter(e => e.source === 'CAL').reduce((sum, e) => sum + Number(e.amount), 0);
  const oldPhysicalToBox = Number(closing.physicalToBox);
  const saleExpenses = expenses.filter(e => e.source === 'SALE').reduce((sum, e) => sum + e.amount, 0);
  const calExpenses = expenses.filter(e => e.source === 'CAL').reduce((sum, e) => sum + e.amount, 0);
  const totalSales = cashSales + easypaisaSales;
  const registerTotal = totalSales + saleExpenses;
  const physicalToBox = totalSales - saleExpenses;

  return prisma.$transaction(async (tx) => {
    await tx.vendorPayment.deleteMany({ where: { closingId: id } });
    await tx.dailyExpense.deleteMany({ where: { closingId: id } });

    const result = await tx.dailyClosing.update({
      where: { id },
      data: {
        cashSales, easypaisaSales, totalSales, registerTotal, physicalToBox,
        notes: body.notes !== undefined ? body.notes : closing.notes,
        expenses: {
          create: expenses.map(e => ({
            description: e.description, amount: e.amount, source: e.source,
            ownerId: requestingUser.ownerId,
            ...(e.vendorId ? { vendorId: e.vendorId } : {}),
          })),
        },
      },
      select: DAILY_CLOSING_SELECT,
    });

    const vendorExpenses = expenses.filter(e => e.vendorId);
    for (const e of vendorExpenses) {
      await tx.vendorPayment.create({
        data: {
          vendorId: e.vendorId,
          branchId: closing.branchId,
          amount: e.amount,
          source: e.source,
          description: e.description,
          date: new Date(closing.closingDate),
          recordedBy: requestingUser.userId,
          ownerId: requestingUser.ownerId,
          closingId: id,
        },
      });
    }

    const calBox = await tx.calBox.upsert({
      where: { branchId: closing.branchId },
      create: { branchId: closing.branchId, balance: 0, ownerId: requestingUser.ownerId },
      update: {},
    });

    await tx.calBox.update({
      where: { branchId: closing.branchId },
      data: { balance: Number(calBox.balance) - oldPhysicalToBox + oldCalExpenses + physicalToBox - calExpenses },
    });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'DAILY_CLOSING_UPDATED',
        entity_type: 'daily_closing',
        entity_id: id,
        description: `Daily closing updated for closing ID ${id}`,
        ownerId: requestingUser.ownerId,
      },
    });

    return result;
  });
};

exports.deleteClosing = async ({ id, requestingUser }) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };

  const closing = await prisma.dailyClosing.findUnique({
    where: { id, ...ownerFilter },
    select: {
      id: true,
      branchId: true,
      enteredBy: true,
      closingDate: true,
      physicalToBox: true,
      expenses: { select: { id: true, amount: true, source: true } },
    },
  });

  if (!closing) throw new AppError('Daily closing not found', 404);

  if (requestingUser.role === 'branch_manager' && closing.enteredBy !== requestingUser.userId) {
    throw new AppError('You can only delete your own entries.', 403);
  }

  const closingDate = new Date(closing.closingDate);
  const month = closingDate.getUTCMonth() + 1;
  const year = closingDate.getUTCFullYear();
  const lockedMonth = await prisma.monthlyClosing.findUnique({
    where: { branchId_month_year: { branchId: closing.branchId, month, year } },
    select: { isLocked: true },
  });
  if (lockedMonth?.isLocked) {
    throw new AppError('Cannot delete — this month is already closed.', 409);
  }

  await prisma.$transaction(async (tx) => {
    await tx.vendorPayment.deleteMany({ where: { closingId: id } });
    await tx.dailyExpense.deleteMany({ where: { closingId: id } });

    const calExpenses = closing.expenses
      .filter(e => e.source === 'CAL')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const calBox = await tx.calBox.findUnique({ where: { branchId: closing.branchId } });
    if (calBox) {
      await tx.calBox.update({
        where: { branchId: closing.branchId },
        data: { balance: Number(calBox.balance) - Number(closing.physicalToBox) + calExpenses },
      });
    }

    await tx.dailyClosing.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'DAILY_CLOSING_DELETED',
        entity_type: 'daily_closing',
        entity_id: id,
        description: `Daily closing deleted for branch ${closing.branchId} on ${closing.closingDate}`,
        ownerId: requestingUser.ownerId,
      },
    });
  });
};
