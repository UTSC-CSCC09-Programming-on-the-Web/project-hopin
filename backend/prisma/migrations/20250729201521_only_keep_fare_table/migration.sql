/*
  Warnings:

  - You are about to drop the column `category` on the `Fare` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `Fare` table. All the data in the column will be lost.
  - You are about to drop the `ConnectAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarePayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserFarePayment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `descriptions` to the `Fare` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ConnectAccount" DROP CONSTRAINT "ConnectAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "FarePayment" DROP CONSTRAINT "FarePayment_groupId_fkey";

-- DropForeignKey
ALTER TABLE "UserFarePayment" DROP CONSTRAINT "UserFarePayment_farePaymentId_fkey";

-- DropForeignKey
ALTER TABLE "UserFarePayment" DROP CONSTRAINT "UserFarePayment_userId_fkey";

-- AlterTable
ALTER TABLE "Fare" DROP COLUMN "category",
DROP COLUMN "details",
ADD COLUMN     "descriptions" TEXT NOT NULL;

-- DropTable
DROP TABLE "ConnectAccount";

-- DropTable
DROP TABLE "FarePayment";

-- DropTable
DROP TABLE "UserFarePayment";
