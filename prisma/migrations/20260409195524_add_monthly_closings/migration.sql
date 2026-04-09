-- CreateTable
CREATE TABLE "MonthlyClosing" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "closedBy" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalCashSales" DECIMAL(12,2) NOT NULL,
    "totalEasypaisaSales" DECIMAL(12,2) NOT NULL,
    "totalSales" DECIMAL(12,2) NOT NULL,
    "totalExpenses" DECIMAL(12,2) NOT NULL,
    "netBachat" DECIMAL(12,2) NOT NULL,
    "daysRecorded" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyClosing_branchId_month_year_key" ON "MonthlyClosing"("branchId", "month", "year");

-- AddForeignKey
ALTER TABLE "MonthlyClosing" ADD CONSTRAINT "MonthlyClosing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyClosing" ADD CONSTRAINT "MonthlyClosing_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
