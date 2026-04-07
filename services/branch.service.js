const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

exports.listBranches = async () => {
  return prisma.branch.findMany({
    include: { managers: { select: { id: true, name: true, email: true } } },
  });
};

exports.createBranch = async ({ name, location, manager_id }) => {
  if (manager_id) {
    const manager = await prisma.user.findUnique({ where: { id: manager_id } });
    if (!manager) throw new AppError('Manager user not found', 404);
    if (manager.role !== 'branch_manager') {
      throw new AppError('Assigned user must have the branch_manager role', 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.create({
      data: { name, location, manager_id: manager_id || null },
    });
    if (manager_id) {
      await tx.user.update({ where: { id: manager_id }, data: { branch_id: branch.id } });
    }
    return branch;
  });
};

exports.getBranch = async (branchId, requestingUser) => {
  if (requestingUser.role === 'branch_manager' && requestingUser.branchId !== branchId) {
    throw new AppError('Access denied to other branches', 403);
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { managers: { select: { id: true, name: true, email: true } } },
  });

  if (!branch) throw new AppError('Branch not found', 404);
  return branch;
};

exports.updateBranch = async (id, { name, location, manager_id, is_active }) => {
  const exists = await prisma.branch.findUnique({ where: { id } });
  if (!exists) throw new AppError('Branch not found', 404);

  if (manager_id) {
    const manager = await prisma.user.findUnique({ where: { id: manager_id } });
    if (!manager) throw new AppError('Manager user not found', 404);
    if (manager.role !== 'branch_manager') {
      throw new AppError('Assigned user must have the branch_manager role', 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.update({
      where: { id },
      data: { name, location, manager_id, is_active },
    });
    if (manager_id) {
      await tx.user.update({ where: { id: manager_id }, data: { branch_id: branch.id } });
    }
    return branch;
  });
};

exports.deactivateBranch = async (id) => {
  const exists = await prisma.branch.findUnique({ where: { id } });
  if (!exists) throw new AppError('Branch not found', 404);

  await prisma.branch.update({ where: { id }, data: { is_active: false } });
};
