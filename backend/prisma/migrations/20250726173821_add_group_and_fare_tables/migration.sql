/*
  Warnings:

  - You are about to drop the `StripeEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
-- ALTER TABLE "User" ADD COLUMN     "groupId" TEXT;

-- DropTable
DROP TABLE "StripeEvent";

-- CreateTable
-- CREATE TABLE "Group" (
--     "id" TEXT NOT NULL,
--     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     "updatedAt" TIMESTAMP(3) NOT NULL,
--     "ownerId" TEXT,
--     "driverId" TEXT,

--     CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
-- );

-- CreateTable
CREATE TABLE "Fare" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- CREATE UNIQUE INDEX "Group_ownerId_key" ON "Group"("ownerId");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "Group_driverId_key" ON "Group"("driverId");

-- AddForeignKey
-- ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -- AddForeignKey
-- ALTER TABLE "Group" ADD CONSTRAINT "Group_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fare" ADD CONSTRAINT "Fare_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
