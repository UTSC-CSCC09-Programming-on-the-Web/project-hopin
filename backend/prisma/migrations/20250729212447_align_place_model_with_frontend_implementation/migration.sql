/*
  Warnings:

  - You are about to drop the column `coordinates` on the `Place` table. All the data in the column will be lost.
  - Added the required column `location` to the `Place` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Place" DROP COLUMN "coordinates",
ADD COLUMN     "location" JSONB NOT NULL;
