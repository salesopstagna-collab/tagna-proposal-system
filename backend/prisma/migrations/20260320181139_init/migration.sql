-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('admin', 'sales_engineer', 'commercial', 'field_team', 'finance', 'viewer');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'in_review', 'approved', 'closed');

-- CreateEnum
CREATE TYPE "WorkOrderType" AS ENUM ('automation', 'generic');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "GlobalRole" NOT NULL DEFAULT 'viewer',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "hubspotDealId" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationMemory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'v1',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "CalculationMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectParameters" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "costHHDev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costHHField" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceHHDev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceHHField" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceHHSupport" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "airfare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hotelPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carRentalPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mealsPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pisRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cofinsRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "csllRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "irpjRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inssRate" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectParameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeItem" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "deliverable" TEXT,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "ScopeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "type" "WorkOrderType" NOT NULL DEFAULT 'automation',

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderLine" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "scopeItemId" TEXT,
    "activity" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "hoursDev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursField" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costDev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costField" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceDev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceField" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelDays" INTEGER NOT NULL DEFAULT 0,
    "travelCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DRE" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "grossRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pisDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cofinsDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costHHDev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costHHField" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costThirdParty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costTravel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costSupplies" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDirectCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expEngineering" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expOperations" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expAdmin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ebitda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ebitdaPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ebit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "csll" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "irpj" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netProfitPct" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DRE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supply" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ncm" TEXT,
    "icms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "criteria" TEXT,
    "paymentPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Project_hubspotDealId_key" ON "Project"("hubspotDealId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CalculationMemory_projectId_version_key" ON "CalculationMemory"("projectId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectParameters_memoryId_key" ON "ProjectParameters"("memoryId");

-- CreateIndex
CREATE UNIQUE INDEX "DRE_memoryId_key" ON "DRE"("memoryId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationMemory" ADD CONSTRAINT "CalculationMemory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectParameters" ADD CONSTRAINT "ProjectParameters_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "CalculationMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeItem" ADD CONSTRAINT "ScopeItem_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "CalculationMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "CalculationMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_scopeItemId_fkey" FOREIGN KEY ("scopeItemId") REFERENCES "ScopeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DRE" ADD CONSTRAINT "DRE_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "CalculationMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supply" ADD CONSTRAINT "Supply_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "CalculationMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "CalculationMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
