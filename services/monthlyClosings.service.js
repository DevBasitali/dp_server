const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const MONTHLY_CLOSING_SELECT = {
  id: true, branchId: true, closedBy: true, month: true, year: true,
  totalCashSales: true, totalEasypaisaSales: true, totalSales: true,
  totalExpenses: true, totalSaleExpenses: true, totalCalExpenses: true,
  totalRegister: true, totalPhysical: true, netBachat: true,
  daysRecorded: true, isLocked: true, closedAt: true, createdAt: true,
};

const MONTHLY_CLOSING_LIST_SELECT = {
  ...MONTHLY_CLOSING_SELECT,
  branch: { select: { name: true } },
};

exports.create = async ({ body, requestingUser }) => {
  const { month, year } = body;

  // branch_manager uses their token branchId; owner must supply branchId in body
  const branchId = requestingUser.role === 'branch_manager'
    ? requestingUser.branchId
    : body.branchId;

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
  if (query.month) where.month = parseInt(query.month, 10);

  const closings = await prisma.monthlyClosing.findMany({
    where,
    select: MONTHLY_CLOSING_LIST_SELECT,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const startDate = new Date(currentYear, currentMonth - 1, 1);
  const endDate = new Date(currentYear, currentMonth, 1);

  if (requestingUser.role === 'branch_manager') {
    const branchId = requestingUser.branchId;
    const currentClosing = closings.find(c => c.month === currentMonth && c.year === currentYear);

    let branchStatus;
    if (currentClosing) {
      branchStatus = {
        branchId,
        status: 'CLOSED',
        dailyCount: currentClosing.daysRecorded,
        bachat: Number(currentClosing.netBachat),
      };
    } else {
      const dailyCount = await prisma.dailyClosing.count({
        where: { branchId, ...ownerFilter, closingDate: { gte: startDate, lt: endDate } },
      });
      branchStatus = { branchId, status: 'PENDING', dailyCount, bachat: null };
    }

    return {
      closings,
      currentMonth: { month: currentMonth, year: currentYear, branches: [branchStatus] },
    };
  }

  // Owner / super admin
  const branches = await prisma.branch.findMany({
    where: { ...ownerFilter, is_active: true },
    select: { id: true, name: true },
  });

  const branchStatuses = await Promise.all(branches.map(async (branch) => {
    const currentClosing = closings.find(
      c => c.branchId === branch.id && c.month === currentMonth && c.year === currentYear
    );

    if (currentClosing) {
      return {
        branchId: branch.id,
        branchName: branch.name,
        status: 'CLOSED',
        dailyCount: currentClosing.daysRecorded,
        bachat: Number(currentClosing.netBachat),
        totalSales: Number(currentClosing.totalSales),
      };
    }

    const dailyCount = await prisma.dailyClosing.count({
      where: { branchId: branch.id, ...ownerFilter, closingDate: { gte: startDate, lt: endDate } },
    });

    return {
      branchId: branch.id,
      branchName: branch.name,
      status: 'PENDING',
      dailyCount,
      bachat: null,
      totalSales: null,
    };
  }));

  return {
    closings,
    currentMonth: { month: currentMonth, year: currentYear, branches: branchStatuses },
  };
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
