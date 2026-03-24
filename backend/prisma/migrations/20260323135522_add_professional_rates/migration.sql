/*
  Warnings:

  - You are about to drop the column `activity` on the `WorkOrderLine` table. All the data in the column will be lost.
  - You are about to drop the column `costDev` on the `WorkOrderLine` table. All the data in the column will be lost.
  - You are about to drop the column `costField` on the `WorkOrderLine` table. All the data in the column will be lost.
  - You are about to drop the column `hoursDev` on the `WorkOrderLine` table. All the data in the column will be lost.
  - You are about to drop the column `hoursField` on the `WorkOrderLine` table. All the data in the column will be lost.
  - You are about to drop the column `priceDev` on the `WorkOrderLine` table. All the data in the column will be lost.
  - You are about to drop the column `priceField` on the `WorkOrderLine` table. All the data in the column will be lost.
  - You are about to drop the column `profile` on the `WorkOrderLine` table. All the data in the column will be lost.
  - You are about to drop the column `travelDays` on the `WorkOrderLine` table. All the data in the column will be lost.
  - Added the required column `rateId` to the `WorkOrderLine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WorkOrderLine" DROP COLUMN "activity",
DROP COLUMN "costDev",
DROP COLUMN "costField",
DROP COLUMN "hoursDev",
DROP COLUMN "hoursField",
DROP COLUMN "priceDev",
DROP COLUMN "priceField",
DROP COLUMN "profile",
DROP COLUMN "travelDays",
ADD COLUMN     "days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "rateId" TEXT NOT NULL,
ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProfessionalRate" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "deductionRate" DOUBLE PRECISION NOT NULL DEFAULT 13,
    "contributionMargin" DOUBLE PRECISION NOT NULL DEFAULT 45,
    "travelMargin" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalRate_profile_key" ON "ProfessionalRate"("profile");

-- AddForeignKey
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "ProfessionalRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
