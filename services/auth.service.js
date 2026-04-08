const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');
const denylist = require('../lib/tokenDenylist');

exports.login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { branch: true, vendor: true },
  });

  // Generic message — don't reveal whether the email exists
  if (!user || !user.is_active) {
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, branchId: user.branch_id, vendorId: user.vendor_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token };
};

exports.getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branch_id: true,
      vendor_id: true,
      is_active: true,
    },
  });

  if (!user) throw new AppError('User not found', 404);
  return user;
};

exports.changePassword = async (userId, currentPassword, newPassword, token) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError('Current password is incorrect', 401);

  const password_hash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({ where: { id: userId }, data: { password_hash } });
  denylist.add(token);
};

exports.logout = (token) => {
  denylist.add(token);
};
