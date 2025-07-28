/*
  Warnings:

  - You are about to drop the column `description` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Group` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ownerId]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[driverId]` on the table `Group` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_groupId_key";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "description",
DROP COLUMN "name",
ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Group_ownerId_key" ON "Group"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_driverId_key" ON "Group"("driverId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
