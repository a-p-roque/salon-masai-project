-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "advancePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasRescheduled" BOOLEAN NOT NULL DEFAULT false;
