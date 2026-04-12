-- CreateTable
CREATE TABLE "VendorInventory" (
    "id" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "date" DATE NOT NULL,
    "recordedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayment" (
    "id" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" VARCHAR(10) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "date" DATE NOT NULL,
    "recordedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VendorInventory" ADD CONSTRAINT "VendorInventory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInventory" ADD CONSTRAINT "VendorInventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInventory" ADD CONSTRAINT "VendorInventory_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
