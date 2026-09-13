-- CreateTable
CREATE TABLE "physical_assessments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "recorded_by_professional_id" UUID,
    "weight" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hip" DOUBLE PRECISION,
    "arm" DOUBLE PRECISION,
    "thigh" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physical_assessments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "physical_assessments" ADD CONSTRAINT "physical_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_assessments" ADD CONSTRAINT "physical_assessments_recorded_by_professional_id_fkey" FOREIGN KEY ("recorded_by_professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

