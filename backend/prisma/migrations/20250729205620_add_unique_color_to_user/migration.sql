/*
  Warnings:

  - Added the required column `color` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "color" TEXT NOT NULL,
ALTER COLUMN "isReady" SET DEFAULT false;
