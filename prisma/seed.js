const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  // 1. Super Admin
  const existingSA = await prisma.user.findUnique({ where: { email: 'superadmin@dollarpoint.pk' } });
  if (!existingSA) {
    const sa_hash = await bcrypt.hash('12345678', 10);
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@dollarpoint.pk',
        password_hash: sa_hash,
        role: 'super_admin',
        branch_id: null,
        vendor_id: null,
        createdBy: null,
        is_active: true,
        accountStatus: 'APPROVED',
      },
    });
    console.log('Super Admin seeded: superadmin@dollarpoint.pk');
  } else {
    console.log('Super Admin already exists, skipping.');
  }

  // 2. Owner
  const existingOwner = await prisma.user.findUnique({ where: { email: 'arsalan@dollarpoint.pk' } });
  if (!existingOwner) {
    const owner_hash = await bcrypt.hash('12345678', 10);
    await prisma.user.create({
      data: {
        name: 'Owner',
        email: 'arsalan@dollarpoint.pk',
        password_hash: owner_hash,
        role: 'owner',
        branch_id: null,
        vendor_id: null,
        createdBy: null,
        is_active: true,
        accountStatus: 'APPROVED',
      },
    });
    console.log('Owner seeded: arsalan@dollarpoint.pk');
  } else {
    console.log('Owner already exists, skipping.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
