const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const MONTHLY_CLOSING_SELECT = {
  id: true,
  branchId: true,
  closedBy: true,
  month: true,
  year: true,
  totalCashSales: true,
  totalEasypaisaSales: true,
  totalSales: true,
  totalExpenses: true,
  netBachat: true,
  daysRecorded: true,
  isLocked: true,
  closedAt: true,
  createdAt: true,
};

exports.create = async ({ body, requestingUser }) => {
  const { month, year } = body;
  const branchId = requestingUser.branchId;

  if (!branchId) throw new AppError('branchId is required', 400);

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new AppError('Branch not found', 404);

  const existing = await prisma.monthlyClosing.findUnique({
    where: { branchId_month_year: { branchId, month, year } },
  });
  if (existing) throw new AppError('This month is already closed.', 409);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const dailyClosings = await prisma.dailyClosing.findMany({
    where: {
      branchId,
      closingDate: { gte: startDate, lt: endDate },
    },
    select: {
      cashSales: true,
      easypaisaSales: true,
      dailyExpense: true,
      totalSales: true,
    },
  });

  if (dailyClosings.length === 0) {
    throw new AppError('No daily entries found for this month. Cannot close.', 400);
  }

  const totalCashSales = dailyClosings.reduce((sum, r) => sum + Number(r.cashSales), 0);
  const totalEasypaisaSales = dailyClosings.reduce((sum, r) => sum + Number(r.easypaisaSales), 0);
  const totalSales = totalCashSales + totalEasypaisaSales;
  const totalExpenses = dailyClosings.reduce((sum, r) => sum + Number(r.dailyExpense), 0);
  const netBachat = totalSales - totalExpenses;
  const daysRecorded = dailyClosings.length;

  const result = await prisma.$transaction(async (tx) => {
    const monthlyClosing = await tx.monthlyClosing.create({
      data: {
        branchId,
        closedBy: requestingUser.userId,
        month,
        year,
        totalCashSales,
        totalEasypaisaSales,
        totalSales,
        totalExpenses,
        netBachat,
        daysRecorded,
        isLocked: true,
        closedAt: new Date(),
      },
      select: MONTHLY_CLOSING_SELECT,
    });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'MONTH_CLOSED',
        entity_type: 'monthly_closing',
        entity_id: monthlyClosing.id,
        description: `Month ${month}/${year} closed for branch ${branch.name}`,
      },
    });

    return monthlyClosing;
  });

  return result;
};

exports.list = async ({ requestingUser, query }) => {
  const where = {};

  if (requestingUser.role === 'branch_manager') {
    where.branchId = requestingUser.branchId;
  } else if (query.branchId) {
    where.branchId = query.branchId;
  }

  if (query.year) {
    where.year = parseInt(query.year, 10);
  }

  return prisma.monthlyClosing.findMany({
    where,
    select: MONTHLY_CLOSING_SELECT,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
};

exports.getById = async ({ id, requestingUser }) => {
  const monthlyClosing = await prisma.monthlyClosing.findUnique({
    where: { id },
    select: MONTHLY_CLOSING_SELECT,
  });

  if (!monthlyClosing) throw new AppError('Monthly closing not found', 404);

  if (
    requestingUser.role === 'branch_manager' &&
    monthlyClosing.branchId !== requestingUser.branchId
  ) {
    throw new AppError('Access denied', 403);
  }

  const { month, year, branchId } = monthlyClosing;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const dailyBreakdown = await prisma.dailyClosing.findMany({
    where: {
      branchId,
      closingDate: { gte: startDate, lt: endDate },
    },
    select: {
      closingDate: true,
      cashSales: true,
      easypaisaSales: true,
      dailyExpense: true,
      totalSales: true,
      netTotal: true,
    },
    orderBy: { closingDate: 'asc' },
  });

  return { ...monthlyClosing, dailyBreakdown };
};
