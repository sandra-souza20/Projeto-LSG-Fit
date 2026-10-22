-- CreateEnum
CREATE TYPE "GymLinkStatus" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "gym_status" "GymLinkStatus";

-- Vinculos que ja existiam antes da aprovacao continuam valendo.
UPDATE "professionals" SET "gym_status" = 'ACTIVE' WHERE "gym_id" IS NOT NULL;
