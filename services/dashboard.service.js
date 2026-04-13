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

  // Range covering the full UTC day — avoids exact-match timezone mismatches
  const todayStart = new Date(todayStr + 'T00:00:00.000Z');
  const tomorrowStart = new Date(todayStr + 'T00:00:00.000Z');
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  console.log('Dashboard date range — today:', todayStart.toISOString(), '→ tomorrow:', tomorrowStart.toISOString());

  const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
  const monthEnd = new Date(Date.UTC(currentYear, currentMonth, 1));

  // Run all queries in parallel
  const [
    totalBilledResult,
    totalPaidResult,
    totalPaidThisMonthResult,
    activeBranchesCount,
    branches,
    vendors,
    rawTodaySales,
    rawBranchToday,
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

    // Raw SQL: today's total sales — uses DB CURRENT_DATE to bypass timezone issues
    prisma.$queryRaw`
      SELECT SUM("cashSales" + "easypaisaSales") as total,
             "closingDate"::date as closing_day,
             CURRENT_DATE as today
      FROM "DailyClosing"
      WHERE "ownerId" = ${ownerId}::uuid
        AND "closingDate"::date = CURRENT_DATE
      GROUP BY "closingDate"::date
    `,

    // Raw SQL: today's sales per branch
    prisma.$queryRaw`
      SELECT "branchId",
             SUM("cashSales" + "easypaisaSales") as today_sales
      FROM "DailyClosing"
      WHERE "ownerId" = ${ownerId}::uuid
        AND "closingDate"::date = CURRENT_DATE
      GROUP BY "branchId"
    `,
  ]);

  console.log('Raw SQL today sales:', rawTodaySales);
  console.log('Branch today sales:', rawBranchToday);

  // Stats
  const totalBilled = Number(totalBilledResult._sum.amount ?? 0);
  const totalPaid = Number(totalPaidResult._sum.amount ?? 0);
  const totalOutstanding = totalBilled - totalPaid;

  const totalPaidThisMonth = Number(totalPaidThisMonthResult._sum.amount ?? 0);

  const todaysSales = rawTodaySales[0]?.total ? Number(rawTodaySales[0].total) : 0;

  // Map branchId → today's sales from the bulk raw query
  const branchTodayMap = new Map(
    rawBranchToday.map(r => [r.branchId, Number(r.today_sales)])
  );

  // Branch sales overview — fetch per-branch data in parallel
  const branchSalesOverview = await Promise.all(
    branches.map(async (branch) => {
      const [monthClosings, monthlyClosing] = await Promise.all([
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

      const todaySales = branchTodayMap.get(branch.id) ?? 0;

      const thisMonthSales = Number(monthClosings._sum.cashSales ?? 0) + Number(monthClosings._sum.easypaisaSales ?? 0);

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
