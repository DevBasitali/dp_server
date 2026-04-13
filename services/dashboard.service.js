const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

exports.getOwnerDashboard = async ({ requestingUser }) => {
  if (requestingUser.role !== 'owner') {
    throw new AppError('Access denied. Owner role required.', 403);
  }

  const ownerId = requestingUser.ownerId;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();

  const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
  const monthEnd = new Date(Date.UTC(currentYear, currentMonth, 1));

  // Run all queries in parallel
  const [
    totalBilledResult,
    totalPaidResult,
    totalPaidThisMonthResult,
    todaysSalesResult,
    activeBranchesCount,
    branches,
    vendors,
  ] = await Promise.all([
    // Sum of all vendor inventory (billed)
    prisma.vendorInventory.aggregate({
      where: { ownerId },
      _sum: { amount: true },
    }),

    // Sum of all vendor payments (paid total)
    prisma.vendorPayment.aggregate({
      where: { ownerId },
      _sum: { amount: true },
    }),

    // Sum of vendor payments this month
    prisma.vendorPayment.aggregate({
      where: {
        ownerId,
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),

    // Today's sales across all branches
    prisma.dailyClosing.aggregate({
      where: {
        ownerId,
        closingDate: new Date(todayStr),
      },
      _sum: { cashSales: true, easypaisaSales: true },
    }),

    // Active branches count
    prisma.branch.count({
      where: { ownerId, is_active: true },
    }),

    // All active branches for overview
    prisma.branch.findMany({
      where: { ownerId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),

    // All active vendors for outstanding
    prisma.vendor.findMany({
      where: { ownerId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Stats
  const totalBilled = Number(totalBilledResult._sum.amount ?? 0);
  const totalPaid = Number(totalPaidResult._sum.amount ?? 0);
  const totalOutstanding = totalBilled - totalPaid;

  const totalPaidThisMonth = Number(totalPaidThisMonthResult._sum.amount ?? 0);

  const todaysCash = Number(todaysSalesResult._sum.cashSales ?? 0);
  const todaysEasypaisa = Number(todaysSalesResult._sum.easypaisaSales ?? 0);
  const todaysSales = todaysCash + todaysEasypaisa;

  // Branch sales overview — fetch per-branch data in parallel
  const branchSalesOverview = await Promise.all(
    branches.map(async (branch) => {
      const [todayClosing, monthClosings, monthlyClosing] = await Promise.all([
        prisma.dailyClosing.findUnique({
          where: { branchId_closingDate: { branchId: branch.id, closingDate: new Date(todayStr) } },
          select: { cashSales: true, easypaisaSales: true },
        }),
        prisma.dailyClosing.aggregate({
          where: {
            ownerId,
            branchId: branch.id,
            closingDate: { gte: monthStart, lt: monthEnd },
          },
          _sum: { cashSales: true, easypaisaSales: true },
        }),
        prisma.monthlyClosing.findUnique({
          where: { branchId_month_year: { branchId: branch.id, month: currentMonth, year: currentYear } },
          select: { netBachat: true },
        }),
      ]);

      const todayCash = Number(todayClosing?.cashSales ?? 0);
      const todayEP = Number(todayClosing?.easypaisaSales ?? 0);
      const todaySales = todayCash + todayEP;

      const monthCash = Number(monthClosings._sum.cashSales ?? 0);
      const monthEP = Number(monthClosings._sum.easypaisaSales ?? 0);
      const thisMonthSales = monthCash + monthEP;

      return {
        branchId: branch.id,
        branchName: branch.name,
        todaySales,
        thisMonthSales,
        thisMonthBachat: monthlyClosing ? Number(monthlyClosing.netBachat) : null,
        monthStatus: monthlyClosing ? 'closed' : 'open',
      };
    })
  );

  // Vendor outstanding — fetch per-vendor inventory and payment totals in parallel
  const vendorOutstanding = await Promise.all(
    vendors.map(async (vendor) => {
      const [billed, paid] = await Promise.all([
        prisma.vendorInventory.aggregate({
          where: { ownerId, vendorId: vendor.id },
          _sum: { amount: true },
        }),
        prisma.vendorPayment.aggregate({
          where: { ownerId, vendorId: vendor.id },
          _sum: { amount: true },
        }),
      ]);

      const totalBilledV = Number(billed._sum.amount ?? 0);
      const totalPaidV = Number(paid._sum.amount ?? 0);

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        totalBilled: totalBilledV,
        totalPaid: totalPaidV,
        outstandingBalance: totalBilledV - totalPaidV,
      };
    })
  );

  // Sort vendors by highest outstanding first
  vendorOutstanding.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

  return {
    stats: {
      totalOutstanding,
      totalPaidThisMonth,
      todaysSales,
      activeBranches: activeBranchesCount,
    },
    branchSalesOverview,
    vendorOutstanding,
  };
};
