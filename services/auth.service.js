const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');
const denylist = require('../lib/tokenDenylist');

exports.signup = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const password_hash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password_hash,
      role: 'owner',
      accountStatus: 'PENDING',
      branch_id: null,
      vendor_id: null,
      createdBy: null,
      is_active: true,
    },
  });

  return {
    success: true,
    message: 'Signup successful. Your account is pending approval from the administrator.',
  };
};

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

  // super_admin: only block if BANNED, never PENDING
  if (user.role === 'super_admin') {
    if (user.accountStatus === 'BANNED') {
      throw new AppError('Your account has been banned. Please contact support.', 403);
    }
    const token = jwt.sign(
      { userId: user.id, role: 'super_admin', branchId: null, vendorId: null, ownerId: null },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }

  if (user.accountStatus === 'PENDING') {
    throw new AppError('Your account is awaiting approval. Please check back later.', 403);
  }

  if (user.accountStatus === 'BANNED') {
    throw new AppError('Your account has been banned. Please contact support.', 403);
  }

  // For branch_manager / vendor: check their owner is not banned
  if (user.role === 'branch_manager' || user.role === 'vendor') {
    let ownerRecord;
    if (user.role === 'branch_manager') {
      const branch = await prisma.branch.findUnique({ where: { id: user.branch_id } });
      if (branch) ownerRecord = await prisma.user.findUnique({ where: { id: branch.ownerId } });
    } else {
      const vendor = await prisma.vendor.findUnique({ where: { id: user.vendor_id } });
      if (vendor) ownerRecord = await prisma.user.findUnique({ where: { id: vendor.ownerId } });
    }
    if (ownerRecord && ownerRecord.accountStatus === 'BANNED') {
      throw new AppError('Your account has been suspended. Contact your administrator.', 403);
    }
  }

  // Resolve ownerId based on role
  let ownerId;
  if (user.role === 'owner') {
    ownerId = user.id;
  } else if (user.role === 'branch_manager') {
    const branch = await prisma.branch.findUnique({ where: { id: user.branch_id } });
    if (!branch) throw new AppError('Branch not found for this user', 500);
    ownerId = branch.ownerId;
  } else if (user.role === 'vendor') {
    const vendor = await prisma.vendor.findUnique({ where: { id: user.vendor_id } });
    if (!vendor) throw new AppError('Vendor not found for this user', 500);
    ownerId = vendor.ownerId;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, branchId: user.branch_id, vendorId: user.vendor_id, ownerId },
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
