/*
  Warnings:

  - A unique constraint covering the columns `[folio]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - The required column `folio` was added to the `Appointment` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "folio" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_folio_key" ON "Appointment"("folio");
