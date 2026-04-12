-- Migration: add_owner_isolation
-- Strategy: add columns nullable, backfill with owner user id, then set NOT NULL

-- Step 1: Add createdBy to User (nullable, no backfill needed)
ALTER TABLE "User" ADD COLUMN "createdBy" UUID;

-- Step 2: Add ownerId columns as nullable to all tables
ALTER TABLE "Branch"           ADD COLUMN "ownerId" UUID;
ALTER TABLE "Vendor"           ADD COLUMN "ownerId" UUID;
ALTER TABLE "VendorBranchLink" ADD COLUMN "ownerId" UUID;
ALTER TABLE "Item"             ADD COLUMN "ownerId" UUID;
ALTER TABLE "AuditLog"         ADD COLUMN "ownerId" UUID;
ALTER TABLE "VendorOrder"      ADD COLUMN "ownerId" UUID;
ALTER TABLE "DailyClosing"     ADD COLUMN "ownerId" UUID;
ALTER TABLE "DailyExpense"     ADD COLUMN "ownerId" UUID;
ALTER TABLE "CalBox"           ADD COLUMN "ownerId" UUID;
ALTER TABLE "MonthlyClosing"   ADD COLUMN "ownerId" UUID;
ALTER TABLE "VendorInventory"  ADD COLUMN "ownerId" UUID;
ALTER TABLE "VendorPayment"    ADD COLUMN "ownerId" UUID;

-- Step 3: Backfill all existing rows with the first (and only) owner's id
UPDATE "Branch"           SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "Vendor"           SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "VendorBranchLink" SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "Item"             SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "AuditLog"         SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "VendorOrder"      SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "DailyClosing"     SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "DailyExpense"     SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "CalBox"           SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "MonthlyClosing"   SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "VendorInventory"  SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;
UPDATE "VendorPayment"    SET "ownerId" = (SELECT id FROM "User" WHERE role = 'owner' LIMIT 1) WHERE "ownerId" IS NULL;

-- Step 4: Set NOT NULL now that all rows are populated
ALTER TABLE "Branch"           ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Vendor"           ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "VendorBranchLink" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Item"             ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "AuditLog"         ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "VendorOrder"      ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "DailyClosing"     ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "DailyExpense"     ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "CalBox"           ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "MonthlyClosing"   ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "VendorInventory"  ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "VendorPayment"    ALTER COLUMN "ownerId" SET NOT NULL;

-- Step 5: Add foreign key constraints
ALTER TABLE "Branch"           ADD CONSTRAINT "Branch_ownerId_fkey"           FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vendor"           ADD CONSTRAINT "Vendor_ownerId_fkey"           FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorBranchLink" ADD CONSTRAINT "VendorBranchLink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Item"             ADD CONSTRAINT "Item_ownerId_fkey"             FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog"         ADD CONSTRAINT "AuditLog_ownerId_fkey"         FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorOrder"      ADD CONSTRAINT "VendorOrder_ownerId_fkey"      FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyClosing"     ADD CONSTRAINT "DailyClosing_ownerId_fkey"     FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyExpense"     ADD CONSTRAINT "DailyExpense_ownerId_fkey"     FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalBox"           ADD CONSTRAINT "CalBox_ownerId_fkey"           FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MonthlyClosing"   ADD CONSTRAINT "MonthlyClosing_ownerId_fkey"   FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorInventory"  ADD CONSTRAINT "VendorInventory_ownerId_fkey"  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorPayment"    ADD CONSTRAINT "VendorPayment_ownerId_fkey"    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
