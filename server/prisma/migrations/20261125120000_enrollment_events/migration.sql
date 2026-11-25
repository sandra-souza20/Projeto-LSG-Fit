-- Historico da matricula, usado no relatorio mensal da academia.

-- CreateEnum
CREATE TYPE "EnrollmentEventType" AS ENUM ('ENROLLED', 'CANCELLED', 'LEFT', 'DEACTIVATED', 'ACTIVATED');

-- CreateTable
CREATE TABLE "enrollment_events" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "type" "EnrollmentEventType" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_events_pkey" PRIMARY KEY ("id")
);

-- Ate aqui so existia a matricula atual: ela vira o primeiro evento de cada
-- aluno (e a inativacao, se houver). Cancelamentos antigos se perderam.
INSERT INTO "enrollment_events" ("id", "student_id", "gym_id", "type", "at")
SELECT gen_random_uuid(), "id", "gym_id", 'ENROLLED', COALESCE("gym_enrolled_at", "created_at")
FROM "users"
WHERE "role" = 'STUDENT' AND "gym_id" IS NOT NULL;

INSERT INTO "enrollment_events" ("id", "student_id", "gym_id", "type", "at")
SELECT gen_random_uuid(), "id", "gym_id", 'DEACTIVATED', "gym_inactivated_at"
FROM "users"
WHERE "role" = 'STUDENT' AND "gym_id" IS NOT NULL AND "gym_inactivated_at" IS NOT NULL;

-- CreateIndex
CREATE INDEX "enrollment_events_gym_id_at_idx" ON "enrollment_events"("gym_id", "at");

-- AddForeignKey
ALTER TABLE "enrollment_events" ADD CONSTRAINT "enrollment_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_events" ADD CONSTRAINT "enrollment_events_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
