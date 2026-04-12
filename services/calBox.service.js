const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

exports.listAll = async (requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { ownerId: requestingUser.ownerId };
  const boxes = await prisma.calBox.findMany({
    where: ownerFilter,
    select: {
      branchId: true, balance: true, updatedAt: true,
      branch: { select: { name: true } },
    },
    orderBy: { branch: { name: 'asc' } },
  });

  return boxes.map(b => ({
    branchId: b.branchId,
    branchName: b.branch.name,
    balance: b.balance,
    updatedAt: b.updatedAt,
  }));
};

exports.getByBranch = async ({ branchId, requestingUser }) => {
  if (requestingUser.role === 'branch_manager' && branchId !== requestingUser.branchId) {
    throw new AppError('Access denied', 403);
  }

  const box = await prisma.calBox.findUnique({
    where: { branchId },
    select: { branchId: true, balance: true, updatedAt: true, ownerId: true, branch: { select: { name: true } } },
  });

  if (!box) throw new AppError('CalBox not found for this branch', 404);
  if (!requestingUser.isSuperAdmin && box.ownerId !== requestingUser.ownerId) {
    throw new AppError('Access denied', 403);
  }

  return { branchId: box.branchId, branchName: box.branch.name, balance: box.balance, updatedAt: box.updatedAt };
};
