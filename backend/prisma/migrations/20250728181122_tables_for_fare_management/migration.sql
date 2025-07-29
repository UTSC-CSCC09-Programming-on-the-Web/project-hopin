/*
  Warnings:

  - You are about to drop the column `notes` on the `Fare` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Fare" DROP COLUMN "notes",
ADD COLUMN     "details" TEXT;

-- CreateTable
CREATE TABLE "FarePayment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "status" TEXT,
    "transferId" TEXT,
    "transferAmount" DECIMAL(65,30),
    "transferStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFarePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "farePaymentId" TEXT NOT NULL,
    "amountOwed" DECIMAL(65,30),
    "amountPaid" DECIMAL(65,30),
    "paymentStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFarePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "payoutEnabled" BOOLEAN DEFAULT false,
    "detailsSubmitted" BOOLEAN DEFAULT false,
    "chargesEnabled" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFarePayment_userId_farePaymentId_key" ON "UserFarePayment"("userId", "farePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectAccount_userId_key" ON "ConnectAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectAccount_accountId_key" ON "ConnectAccount"("accountId");

-- AddForeignKey
ALTER TABLE "FarePayment" ADD CONSTRAINT "FarePayment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFarePayment" ADD CONSTRAINT "UserFarePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFarePayment" ADD CONSTRAINT "UserFarePayment_farePaymentId_fkey" FOREIGN KEY ("farePaymentId") REFERENCES "FarePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectAccount" ADD CONSTRAINT "ConnectAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
