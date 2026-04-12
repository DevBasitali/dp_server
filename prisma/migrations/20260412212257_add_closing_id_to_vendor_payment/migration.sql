-- AlterTable
ALTER TABLE "VendorPayment" ADD COLUMN     "closingId" UUID;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_closingId_fkey" FOREIGN KEY ("closingId") REFERENCES "DailyClosing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
