const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash('Admin@1234', salt);

  // 1. Create Owner User
  const owner = await prisma.user.upsert({
    where: { email: 'owner@dollarpoint.pk' },
    update: {},
    create: {
      name: 'Owner',
      email: 'owner@dollarpoint.pk',
      password_hash,
      role: 'owner',
      is_active: true,
    },
  });
  console.log(`Owner created: ${owner.email}`);

  // 2. Create sample Branch
  const branch = await prisma.branch.create({
    data: {
      name: 'Alipur Branch',
      location: 'Alipur, Rawalpindi',
      is_active: true,
    },
  });
  console.log(`Branch created: ${branch.name}`);

  // 3. Create sample Vendor
  const vendor = await prisma.vendor.create({
    data: {
      name: 'Hamza Melamine',
      phone: '03001234567',
      whatsapp_number: '03001234567',
      category: 'Melamine',
      notes: 'Sample vendor initialized by system.',
      is_active: true,
    },
  });
  console.log(`Vendor created: ${vendor.name}`);

  // 4. Link vendor to branch
  await prisma.vendorBranchLink.create({
    data: {
      vendor_id: vendor.id,
      branch_id: branch.id,
    },
  });
  console.log(`Linked Vendor to Branch.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
