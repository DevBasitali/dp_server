-- CreateTable
CREATE TABLE "VendorOrder" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "notes" TEXT,
    "pdf_url" TEXT,
    "whatsapp_sent" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorOrderItem" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "item_name" VARCHAR(150) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorOrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrderItem" ADD CONSTRAINT "VendorOrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "VendorOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
