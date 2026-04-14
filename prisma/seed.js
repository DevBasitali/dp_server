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
  let owner = await prisma.user.findUnique({ where: { email: 'arsalan@dollarpoint.pk' } });
  if (!owner) {
    const owner_hash = await bcrypt.hash('12345678', 10);
    owner = await prisma.user.create({
      data: {
        name: 'Arsalan',
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

  // 3. Branches
  let branch1 = await prisma.branch.findFirst({
    where: { name: 'Alipur Branch', ownerId: owner.id }
  });
  if (!branch1) {
    branch1 = await prisma.branch.create({
      data: {
        name: 'Alipur Branch',
        location: 'Alipur Chowk, Rawalpindi',
        ownerId: owner.id,
        is_active: true,
      },
    });
    console.log('Branch seeded: Alipur Branch');
  } else {
    console.log('Alipur Branch already exists, skipping.');
  }

  let branch2 = await prisma.branch.findFirst({
    where: { name: 'Islamabad Branch', ownerId: owner.id }
  });
  if (!branch2) {
    branch2 = await prisma.branch.create({
      data: {
        name: 'Islamabad Branch',
        location: 'Blue Area, Islamabad',
        ownerId: owner.id,
        is_active: true,
      },
    });
    console.log('Branch seeded: Islamabad Branch');
  } else {
    console.log('Islamabad Branch already exists, skipping.');
  }

  // 4. Vendors
  const vendorsData = [
    {
      name: 'Hamza Melamine',
      phone: '03001234567',
      whatsapp_number: '923001234567',
      category: 'Melamine',
      notes: 'Main melamine supplier',
    },
    {
      name: 'Toy World',
      phone: '03119876543',
      whatsapp_number: '923119876543',
      category: 'Toys',
      notes: 'All toy categories',
    },
    {
      name: 'Jewel King',
      phone: '03331122334',
      whatsapp_number: '923331122334',
      category: 'Jewellery',
      notes: 'Artificial jewellery supplier',
    },
    {
      name: 'Plastic House',
      phone: '03215566778',
      whatsapp_number: '923215566778',
      category: 'Household',
      notes: 'Plastic household items',
    },
    {
      name: 'Cloth Corner',
      phone: '03004433221',
      whatsapp_number: '923004433221',
      category: 'Clothing',
      notes: 'Socks and clothing items',
    },
  ];

  for (const v of vendorsData) {
    let vendor = await prisma.vendor.findFirst({
      where: { name: v.name, ownerId: owner.id }
    });

    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: {
          ...v,
          ownerId: owner.id,
          is_active: true,
        },
      });
      console.log(`Vendor seeded: ${v.name}`);
    } else {
      console.log(`Vendor already exists, skipping: ${v.name}`);
    }

    // Link vendor to both branches
    for (const branch of [branch1, branch2]) {
      const existingLink = await prisma.vendorBranchLink.findFirst({
        where: { vendor_id: vendor.id, branch_id: branch.id }
      });

      if (!existingLink) {
        await prisma.vendorBranchLink.create({
          data: {
            vendor_id: vendor.id,
            branch_id: branch.id,
            ownerId: owner.id,
          },
        });
        console.log(`Linked ${v.name} → ${branch.name}`);
      }
    }
  }

  console.log('\n✅ Seed complete!');
  console.log('Super Admin: superadmin@dollarpoint.pk / 12345678');
  console.log('Owner:       arsalan@dollarpoint.pk / 12345678');
  console.log('Branches:    Alipur Branch, Islamabad Branch');
  console.log('Vendors:     5 vendors linked to both branches');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



// const { PrismaClient } = require('@prisma/client');
// const bcrypt = require('bcrypt');
// const prisma = new PrismaClient();

// async function main() {
//   // 1. Super Admin
//   const existingSA = await prisma.user.findUnique({ where: { email: 'superadmin@dollarpoint.pk' } });
//   if (!existingSA) {
//     const sa_hash = await bcrypt.hash('12345678', 10);
//     await prisma.user.create({
//       data: {
//         name: 'Super Admin',
//         email: 'superadmin@dollarpoint.pk',
//         password_hash: sa_hash,
//         role: 'super_admin',
//         branch_id: null,
//         vendor_id: null,
//         createdBy: null,
//         is_active: true,
//         accountStatus: 'APPROVED',
//       },
//     });
//     console.log('Super Admin seeded: superadmin@dollarpoint.pk');
//   } else {
//     console.log('Super Admin already exists, skipping.');
//   }

//   // 2. Owner
//   const existingOwner = await prisma.user.findUnique({ where: { email: 'arsalan@dollarpoint.pk' } });
//   if (!existingOwner) {
//     const owner_hash = await bcrypt.hash('12345678', 10);
//     await prisma.user.create({
//       data: {
//         name: 'Owner',
//         email: 'arsalan@dollarpoint.pk',
//         password_hash: owner_hash,
//         role: 'owner',
//         branch_id: null,
//         vendor_id: null,
//         createdBy: null,
//         is_active: true,
//         accountStatus: 'APPROVED',
//       },
//     });
//     console.log('Owner seeded: arsalan@dollarpoint.pk');
//   } else {
//     console.log('Owner already exists, skipping.');
//   }
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
