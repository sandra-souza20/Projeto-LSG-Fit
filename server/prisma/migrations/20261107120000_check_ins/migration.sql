-- Check-in do aluno (aprovado ou negado pela academia em tempo real) e
-- inativacao do aluno pela academia, com motivo.

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gym_inactivated_at" TIMESTAMP(3),
ADD COLUMN     "gym_inactive_reason" TEXT;

-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "status" "CheckInStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decided_by_id" UUID,
    "denial_reason" TEXT,
    "workout_session_id" UUID,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_workout_session_id_key" ON "check_ins"("workout_session_id");

-- CreateIndex
CREATE INDEX "check_ins_gym_id_requested_at_idx" ON "check_ins"("gym_id", "requested_at");

-- CreateIndex
CREATE INDEX "check_ins_student_id_requested_at_idx" ON "check_ins"("student_id", "requested_at");

-- CreateIndex
CREATE INDEX "check_ins_status_requested_at_idx" ON "check_ins"("status", "requested_at");

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "gym_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_workout_session_id_fkey" FOREIGN KEY ("workout_session_id") REFERENCES "workout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

