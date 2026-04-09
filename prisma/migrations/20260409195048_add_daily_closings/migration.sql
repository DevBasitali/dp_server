-- CreateTable
CREATE TABLE "DailyClosing" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "enteredBy" UUID NOT NULL,
    "closingDate" DATE NOT NULL,
    "cashSales" DECIMAL(12,2) NOT NULL,
    "easypaisaSales" DECIMAL(12,2) NOT NULL,
    "dailyExpense" DECIMAL(12,2) NOT NULL,
    "totalSales" DECIMAL(12,2) NOT NULL,
    "netTotal" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyClosing_branchId_closingDate_key" ON "DailyClosing"("branchId", "closingDate");

-- AddForeignKey
ALTER TABLE "DailyClosing" ADD CONSTRAINT "DailyClosing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyClosing" ADD CONSTRAINT "DailyClosing_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
