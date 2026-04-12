const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  branch_id: true,
  vendor_id: true,
  is_active: true,
  created_at: true,
  createdBy: true,
};

exports.listUsers = async (requestingUser, role) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { createdBy: requestingUser.userId };
  return prisma.user.findMany({
    where: {
      ...ownerFilter,
      ...(role ? { role } : {}),
    },
    select: {
      ...SAFE_SELECT,
      branch: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
    },
  });
};

exports.createUser = async ({ name, email, password, role, branch_id, vendor_id }, requestingUser) => {
  // Role-based FK validation
  if (role === 'branch_manager') {
    if (!branch_id) throw new AppError('branch_id is required for branch_manager', 400);
    vendor_id = null;
  } else if (role === 'vendor') {
    if (!vendor_id) throw new AppError('vendor_id is required for vendor', 400);
    branch_id = null;
  } else {
    branch_id = null;
    vendor_id = null;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already in use', 409);

  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, password_hash, role, branch_id, vendor_id, createdBy: requestingUser.userId },
      select: SAFE_SELECT,
    });

    await tx.auditLog.create({
      data: {
        user_id: requestingUser.userId,
        action: 'CREATE_USER',
        entity_type: 'User',
        entity_id: created.id,
        description: `Created user ${email} with role ${role}`,
        ownerId: requestingUser.ownerId,
      },
    });

    return created;
  });

  return user;
};

exports.getUser = async (id, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { createdBy: requestingUser.userId };
  const user = await prisma.user.findUnique({
    where: { id, ...ownerFilter },
    select: SAFE_SELECT,
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
};

exports.updateUser = async (id, data, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { createdBy: requestingUser.userId };
  const existing = await prisma.user.findUnique({ where: { id, ...ownerFilter } });
  if (!existing) throw new AppError('User not found', 404);

  if (data.email && data.email !== existing.email) {
    const taken = await prisma.user.findUnique({ where: { email: data.email } });
    if (taken) throw new AppError('Email already in use', 409);
  }

  return prisma.user.update({
    where: { id },
    data,
    select: SAFE_SELECT,
  });
};

exports.deactivateUser = async (id, requestingUser) => {
  const ownerFilter = requestingUser.isSuperAdmin ? {} : { createdBy: requestingUser.userId };
  const exists = await prisma.user.findUnique({ where: { id, ...ownerFilter } });
  if (!exists) throw new AppError('User not found', 404);

  await prisma.user.update({ where: { id }, data: { is_active: false } });
};
