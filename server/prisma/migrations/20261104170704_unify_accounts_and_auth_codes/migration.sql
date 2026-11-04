-- Unifica as contas do app mobile: aluno e profissional passam a viver em
-- "users" (campo role) e a tabela "professionals" deixa de existir. Os codigos
-- de verificacao/redefinicao saem de "users" e vao para "auth_codes".
-- Ainda nao ha dados reais a migrar: as referencias a profissionais antigos
-- sao zeradas antes de apontar as chaves estrangeiras para "users".

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "AuthCodePurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'PROFESSIONAL_INVITE');

-- DropForeignKey
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_created_by_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "physical_assessments" DROP CONSTRAINT "physical_assessments_recorded_by_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "professionals" DROP CONSTRAINT "professionals_gym_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_professional_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "reset_password_code",
DROP COLUMN "reset_password_code_expires_at",
DROP COLUMN "verification_code",
DROP COLUMN "verification_code_expires_at",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
ADD COLUMN     "specialty" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- Os ids antigos apontavam para "professionals" e nao existem em "users".
UPDATE "users" SET "professional_id" = NULL WHERE "professional_id" IS NOT NULL;
UPDATE "exercises" SET "created_by_professional_id" = NULL WHERE "created_by_professional_id" IS NOT NULL;
UPDATE "physical_assessments" SET "recorded_by_professional_id" = NULL WHERE "recorded_by_professional_id" IS NOT NULL;

-- DropTable
DROP TABLE "professionals";

-- DropEnum
DROP TYPE "GymLinkStatus";

-- CreateTable
CREATE TABLE "auth_codes" (
    "id" UUID NOT NULL,
    "purpose" "AuthCodePurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "user_id" UUID,
    "gym_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_codes_pkey" PRIMARY KEY ("id")
);

-- Cada codigo pertence a exatamente uma conta: um usuario OU uma academia.
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_single_owner_check"
    CHECK (("user_id" IS NOT NULL) <> ("gym_id" IS NOT NULL));

-- CreateIndex
CREATE INDEX "auth_codes_user_id_purpose_idx" ON "auth_codes"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "auth_codes_gym_id_purpose_idx" ON "auth_codes"("gym_id", "purpose");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_created_by_professional_id_fkey" FOREIGN KEY ("created_by_professional_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_assessments" ADD CONSTRAINT "physical_assessments_recorded_by_professional_id_fkey" FOREIGN KEY ("recorded_by_professional_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
