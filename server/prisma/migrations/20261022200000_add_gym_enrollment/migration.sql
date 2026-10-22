-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gym_id" UUID,
ADD COLUMN     "gym_enrolled_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
