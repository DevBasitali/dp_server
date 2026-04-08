-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'branch_manager', 'vendor');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "branch_id" UUID,
    "vendor_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "location" TEXT,
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "whatsapp_number" VARCHAR(20) NOT NULL,
    "category" VARCHAR(100),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBranchLink" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBranchLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(100),
    "vendor_id" UUID NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "selling_price" DECIMAL(10,2) NOT NULL,
    "margin" DECIMAL(10,2) NOT NULL,
    "margin_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "total_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance_remaining" DECIMAL(12,2) NOT NULL,
    "purchase_date" DATE NOT NULL,
    "invoice_number" VARCHAR(100),
    "notes" TEXT,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "item_name" VARCHAR(150) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cost_price_at_purchase" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstallment" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "note" TEXT,
    "entered_by" UUID NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEditLog" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "edited_by" UUID NOT NULL,
    "field_changed" VARCHAR(50) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryRequest" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "whatsapp_sent" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_sent_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryRequestItem" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "item_name" VARCHAR(150) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySale" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "entered_by" UUID NOT NULL,
    "sale_date" DATE NOT NULL,
    "total_sales_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "description" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DailySale_branch_id_sale_date_key" ON "DailySale"("branch_id", "sale_date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBranchLink" ADD CONSTRAINT "VendorBranchLink_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBranchLink" ADD CONSTRAINT "VendorBranchLink_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEditLog" ADD CONSTRAINT "PaymentEditLog_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "PaymentInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEditLog" ADD CONSTRAINT "PaymentEditLog_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRequest" ADD CONSTRAINT "InventoryRequest_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRequest" ADD CONSTRAINT "InventoryRequest_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRequest" ADD CONSTRAINT "InventoryRequest_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRequestItem" ADD CONSTRAINT "InventoryRequestItem_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "InventoryRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
