/*
  Warnings:

  - Added the required column `totalCalExpenses` to the `MonthlyClosing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPhysical` to the `MonthlyClosing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalRegister` to the `MonthlyClosing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalSaleExpenses` to the `MonthlyClosing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MonthlyClosing" ADD COLUMN     "totalCalExpenses" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "totalPhysical" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "totalRegister" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "totalSaleExpenses" DECIMAL(12,2) NOT NULL;
