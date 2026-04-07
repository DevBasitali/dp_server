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
};

exports.listUsers = async () => {
  return prisma.user.findMany({ select: SAFE_SELECT });
};

exports.createUser = async ({ name, email, password, role, branch_id, vendor_id }) => {
  // Business logic check — Zod already validated shape/types
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already in use', 409);

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  return prisma.user.create({
    data: {
      name,
      email,
      password_hash,
      role,
      branch_id: branch_id || null,
      vendor_id: vendor_id || null,
    },
    select: { id: true, name: true, email: true, role: true, branch_id: true, vendor_id: true },
  });
};

exports.getUser = async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
  if (!user) throw new AppError('User not found', 404);
  return user;
};

exports.updateUser = async (id, data) => {
  const exists = await prisma.user.findUnique({ where: { id } });
  if (!exists) throw new AppError('User not found', 404);

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, is_active: true },
  });
};

exports.deactivateUser = async (id) => {
  const exists = await prisma.user.findUnique({ where: { id } });
  if (!exists) throw new AppError('User not found', 404);

  await prisma.user.update({ where: { id }, data: { is_active: false } });
};
