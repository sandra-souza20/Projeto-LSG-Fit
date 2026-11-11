-- Varias pessoas administram a mesma academia (gym_members) e o endereco da
-- academia passa a ter campos separados.

-- CreateEnum
CREATE TYPE "GymMemberRole" AS ENUM ('OWNER', 'ADMIN');

-- AlterEnum
ALTER TYPE "AuthCodePurpose" ADD VALUE 'GYM_MEMBER_INVITE';

-- CreateTable
CREATE TABLE "gym_members" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "GymMemberRole" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_members_pkey" PRIMARY KEY ("id")
);

-- O login de cada academia existente vira o dono (OWNER) dela, com o mesmo
-- e-mail e a mesma senha.
INSERT INTO "gym_members" ("id", "gym_id", "name", "email", "password", "role", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", "name", "email", "password", 'OWNER', "created_at", "updated_at"
FROM "gyms";

-- Codigos da academia sao de curta duracao (15 min): sao descartados.
DELETE FROM "auth_codes" WHERE "gym_id" IS NOT NULL;

-- DropConstraint / DropForeignKey / DropIndex
ALTER TABLE "auth_codes" DROP CONSTRAINT "auth_codes_single_owner_check";
ALTER TABLE "auth_codes" DROP CONSTRAINT "auth_codes_gym_id_fkey";
DROP INDEX "auth_codes_gym_id_purpose_idx";
DROP INDEX "gyms_email_key";

-- AlterTable
ALTER TABLE "auth_codes" DROP COLUMN "gym_id",
ADD COLUMN     "gym_member_id" UUID;

ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_single_owner_check"
    CHECK (("user_id" IS NOT NULL) <> ("gym_member_id" IS NOT NULL));

-- O endereco antigo era texto livre e nao da para separar: e descartado.
ALTER TABLE "gyms" DROP COLUMN "address",
DROP COLUMN "email",
DROP COLUMN "password",
ADD COLUMN     "address_city" TEXT,
ADD COLUMN     "address_complement" TEXT,
ADD COLUMN     "address_district" TEXT,
ADD COLUMN     "address_number" TEXT,
ADD COLUMN     "address_state" CHAR(2),
ADD COLUMN     "address_street" TEXT,
ADD COLUMN     "address_zip_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "gym_members_email_key" ON "gym_members"("email");
CREATE INDEX "gym_members_gym_id_idx" ON "gym_members"("gym_id");
CREATE INDEX "auth_codes_gym_member_id_purpose_idx" ON "auth_codes"("gym_member_id", "purpose");
CREATE INDEX "auth_codes_code_hash_idx" ON "auth_codes"("code_hash");

-- AddForeignKey
ALTER TABLE "gym_members" ADD CONSTRAINT "gym_members_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_gym_member_id_fkey" FOREIGN KEY ("gym_member_id") REFERENCES "gym_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
