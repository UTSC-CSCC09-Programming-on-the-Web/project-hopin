/*
  Warnings:

  - You are about to drop the column `destination` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[destinationId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "destination",
ADD COLUMN     "destinationId" TEXT;

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "coordinates" JSONB NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_destinationId_key" ON "User"("destinationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
