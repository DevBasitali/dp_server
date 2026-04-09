const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const DAILY_CLOSING_SELECT = {
  id: true,
  branchId: true,
  closingDate: true,
  cashSales: true,
  easypaisaSales: true,
  dailyExpense: true,
  totalSales: true,
  netTotal: true,
  notes: true,
  createdAt: true,
};

exports.create = async ({ body, requestingUser }) => {
  const { cashSales, easypaisaSales, dailyExpense, notes } = body;
  let { branchId, closingDate } = body;

  // branch_manager: enforce own branchId
  if (requestingUser.role === 'branch_manager') {
    if (branchId && branchId !== requestingUser.branchId) {
      throw new AppError('branch_manager can only submit closings for their own branch', 403);
    }
    branchId = requestingUser.branchId;
  }

  if (!branchId) throw new AppError('branchId is required', 400);

  // Default closingDate to today
  const dateStr = closingDate || new Date().toISOString().slice(0, 10);
  const parsedDate = new Date(dateStr);

  // Reject negative values (belt-and-suspenders beyond Zod)
  if (cashSales < 0 || easypaisaSales < 0 || dailyExpense < 0) {
    throw new AppError('Values cannot be negative.', 400);
  }

  // Check branch exists
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new AppError('Branch not found', 404);

  // Check month is not locked
  const month = parsedDate.getMonth() + 1;
  const year = parsedDate.getFullYear();
  const lockedMonth = await prisma.monthlyClosing.findUnique({
    where: { branchId_month_year: { branchId, month, year } },
    select: { isLocked: true },
  });
  if (lockedMonth && lockedMonth.isLocked) {
    throw new AppError('This month is already closed. No new entries allowed.', 409);
  }

  // Check for duplicate
  const existing = await prisma.dailyClosing.findUnique({
    where: { branchId_closingDate: { branchId, closingDate: parsedDate } },
  });
  if (existing) throw new AppError('A closing entry already exists for this date.', 409);

  // Calculate server-side
  const totalSales = cashSales + easypaisaSales;
  const netTotal = totalSales - dailyExpense;

  const closing = await prisma.$transaction(async (tx) => {
    const created = await tx.dailyClosing.create({
      data: {
        branchId,
        enteredBy: requestingUser.userId,
        closingDate: parsedDate,
        cashSales,
        easypaisaSales,
        dailyExpense,
        totalSales,
        netTotal,
        notes: notes || null,
      },
      select: DAILY_CLOSING_SELECT,
    });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'DAILY_CLOSING_ADDED',
        entity_type: 'daily_closing',
        entity_id: created.id,
        description: `Daily closing added for branch ${branch.name} on ${dateStr}`,
      },
    });

    return created;
  });

  return closing;
};

exports.list = async ({ requestingUser, query }) => {
  const where = {};

  if (requestingUser.role === 'branch_manager') {
    where.branchId = requestingUser.branchId;
  } else if (query.branchId) {
    where.branchId = query.branchId;
  }

  if (query.month && query.year) {
    const month = parseInt(query.month, 10);
    const year = parseInt(query.year, 10);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    where.closingDate = { gte: startDate, lt: endDate };
  }

  return prisma.dailyClosing.findMany({
    where,
    select: DAILY_CLOSING_SELECT,
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
  const startDate = new Date(yearNum, monthNum - 1, 1);
  const endDate = new Date(yearNum, monthNum, 1);

  const records = await prisma.dailyClosing.findMany({
    where: {
      branchId,
      closingDate: { gte: startDate, lt: endDate },
    },
    select: DAILY_CLOSING_SELECT,
  });

  const totalCashSales = records.reduce((sum, r) => sum + Number(r.cashSales), 0);
  const totalEasypaisaSales = records.reduce((sum, r) => sum + Number(r.easypaisaSales), 0);
  const totalSales = records.reduce((sum, r) => sum + Number(r.totalSales), 0);
  const totalExpenses = records.reduce((sum, r) => sum + Number(r.dailyExpense), 0);
  const netBachat = totalSales - totalExpenses;

  return {
    branchId,
    month: monthNum,
    year: yearNum,
    daysRecorded: records.length,
    totalCashSales,
    totalEasypaisaSales,
    totalSales,
    totalExpenses,
    netBachat,
  };
};

exports.update = async ({ id, body, requestingUser }) => {
  const closing = await prisma.dailyClosing.findUnique({
    where: { id },
    select: { ...DAILY_CLOSING_SELECT, enteredBy: true, branchId: true },
  });

  if (!closing) throw new AppError('Daily closing not found', 404);

  if (requestingUser.role === 'branch_manager') {
    if (closing.enteredBy !== requestingUser.userId) {
      throw new AppError('You can only edit your own entries', 403);
    }
    const today = new Date().toISOString().slice(0, 10);
    const closingDateStr = new Date(closing.closingDate).toISOString().slice(0, 10);
    if (closingDateStr !== today) {
      throw new AppError('branch_manager can only edit entries for today', 403);
    }
  }

  // Check month is not locked
  const closingMonth = new Date(closing.closingDate).getMonth() + 1;
  const closingYear = new Date(closing.closingDate).getFullYear();
  const lockedMonthForUpdate = await prisma.monthlyClosing.findUnique({
    where: { branchId_month_year: { branchId: closing.branchId, month: closingMonth, year: closingYear } },
    select: { isLocked: true },
  });
  if (lockedMonthForUpdate && lockedMonthForUpdate.isLocked) {
    throw new AppError('This month is already closed. No new entries allowed.', 409);
  }

  const cashSales = body.cashSales !== undefined ? body.cashSales : Number(closing.cashSales);
  const easypaisaSales = body.easypaisaSales !== undefined ? body.easypaisaSales : Number(closing.easypaisaSales);
  const dailyExpense = body.dailyExpense !== undefined ? body.dailyExpense : Number(closing.dailyExpense);

  if (cashSales < 0 || easypaisaSales < 0 || dailyExpense < 0) {
    throw new AppError('Values cannot be negative.', 400);
  }

  const totalSales = cashSales + easypaisaSales;
  const netTotal = totalSales - dailyExpense;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.dailyClosing.update({
      where: { id },
      data: {
        cashSales,
        easypaisaSales,
        dailyExpense,
        totalSales,
        netTotal,
        notes: body.notes !== undefined ? body.notes : closing.notes,
      },
      select: DAILY_CLOSING_SELECT,
    });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'DAILY_CLOSING_UPDATED',
        entity_type: 'daily_closing',
        entity_id: id,
        description: `Daily closing updated for closing ID ${id}`,
      },
    });

    return result;
  });

  return updated;
};
