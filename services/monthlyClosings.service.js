const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const MONTHLY_CLOSING_SELECT = {
  id: true, branchId: true, closedBy: true, month: true, year: true,
  totalCashSales: true, totalEasypaisaSales: true, totalSales: true,
  totalExpenses: true, totalSaleExpenses: true, totalCalExpenses: true,
  totalRegister: true, totalPhysical: true, netBachat: true,
  daysRecorded: true, isLocked: true, closedAt: true, createdAt: true,
};

exports.create = async ({ body, requestingUser }) => {
  const { month, year } = body;
  const branchId = requestingUser.branchId;

  if (!branchId) throw new AppError('branchId is required', 400);

  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const branch = await prisma.branch.findUnique({ where: { id: branchId, ...ownerFilter } });
  if (!branch) throw new AppError('Branch not found', 404);

  const existing = await prisma.monthlyClosing.findUnique({
    where: { branchId_month_year: { branchId, month, year } },
  });
  if (existing) throw new AppError('This month is already closed.', 409);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const dailyClosings = await prisma.dailyClosing.findMany({
    where: { branchId, ...ownerFilter, closingDate: { gte: startDate, lt: endDate } },
    select: {
      cashSales: true, easypaisaSales: true, totalSales: true,
      registerTotal: true, physicalToBox: true,
      expenses: { select: { amount: true, source: true } },
    },
  });

  if (dailyClosings.length === 0) {
    throw new AppError('No daily entries found for this month. Cannot close.', 400);
  }

  const totalCashSales = dailyClosings.reduce((s, r) => s + Number(r.cashSales), 0);
  const totalEasypaisaSales = dailyClosings.reduce((s, r) => s + Number(r.easypaisaSales), 0);
  const totalSales = totalCashSales + totalEasypaisaSales;
  const totalRegister = dailyClosings.reduce((s, r) => s + Number(r.registerTotal), 0);
  const totalPhysical = dailyClosings.reduce((s, r) => s + Number(r.physicalToBox), 0);
  const allExpenses = dailyClosings.flatMap(r => r.expenses);
  const totalSaleExpenses = allExpenses.filter(e => e.source === 'SALE').reduce((s, e) => s + Number(e.amount), 0);
  const totalCalExpenses = allExpenses.filter(e => e.source === 'CAL').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = totalSaleExpenses + totalCalExpenses;
  const netBachat = totalSales - totalSaleExpenses;

  return prisma.$transaction(async (tx) => {
    const monthlyClosing = await tx.monthlyClosing.create({
      data: {
        branchId, closedBy: requestingUser.userId, month, year,
        totalCashSales, totalEasypaisaSales, totalSales, totalExpenses,
        totalSaleExpenses, totalCalExpenses, totalRegister, totalPhysical,
        netBachat, daysRecorded: dailyClosings.length,
        isLocked: true, closedAt: new Date(),
        ownerId: requestingUser.ownerId,
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
        ownerId: requestingUser.ownerId,
      },
    });

    return monthlyClosing;
  });
};

exports.list = async ({ requestingUser, query }) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const where = { ...ownerFilter };

  if (requestingUser.role === 'branch_manager') {
    where.branchId = requestingUser.branchId;
  } else if (query.branchId) {
    where.branchId = query.branchId;
  }

  if (query.year) where.year = parseInt(query.year, 10);

  return prisma.monthlyClosing.findMany({
    where,
    select: MONTHLY_CLOSING_SELECT,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
};

exports.getById = async ({ id, requestingUser }) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const monthlyClosing = await prisma.monthlyClosing.findUnique({
    where: { id, ...ownerFilter },
    select: MONTHLY_CLOSING_SELECT,
  });

  if (!monthlyClosing) throw new AppError('Monthly closing not found', 404);

  if (requestingUser.role === 'branch_manager' && monthlyClosing.branchId !== requestingUser.branchId) {
    throw new AppError('Access denied', 403);
  }

  const { month, year, branchId } = monthlyClosing;
  const dailyBreakdown = await prisma.dailyClosing.findMany({
    where: {
      branchId,
      ...ownerFilter,
      closingDate: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
    },
    select: {
      closingDate: true, cashSales: true, easypaisaSales: true, totalSales: true,
      registerTotal: true, physicalToBox: true,
      expenses: { select: { description: true, amount: true, source: true } },
    },
    orderBy: { closingDate: 'asc' },
  });

  return { ...monthlyClosing, dailyBreakdown };
};
