/*
  Warnings:

  - You are about to drop the column `dailyExpense` on the `DailyClosing` table. All the data in the column will be lost.
  - You are about to drop the column `netTotal` on the `DailyClosing` table. All the data in the column will be lost.
  - Added the required column `physicalToBox` to the `DailyClosing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registerTotal` to the `DailyClosing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DailyClosing" DROP COLUMN "dailyExpense",
DROP COLUMN "netTotal",
ADD COLUMN     "physicalToBox" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "registerTotal" DECIMAL(12,2) NOT NULL;

-- CreateTable
CREATE TABLE "DailyExpense" (
    "id" UUID NOT NULL,
    "closingId" UUID NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalBox" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalBox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalBox_branchId_key" ON "CalBox"("branchId");

-- AddForeignKey
ALTER TABLE "DailyExpense" ADD CONSTRAINT "DailyExpense_closingId_fkey" FOREIGN KEY ("closingId") REFERENCES "DailyClosing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalBox" ADD CONSTRAINT "CalBox_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
