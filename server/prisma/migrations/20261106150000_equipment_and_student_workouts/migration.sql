-- Equipamentos em lista fixa (exercicio e academia) e o aluno passa a montar
-- a propria ficha (workout_entries.added_by_id guarda quem adicionou).

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BODYWEIGHT', 'DUMBBELL', 'BARBELL', 'BENCH', 'MAT', 'PULL_UP_BAR', 'KETTLEBELL', 'RESISTANCE_BAND', 'CABLE', 'SMITH', 'LEG_PRESS', 'LEG_EXTENSION', 'LEG_CURL', 'PEC_DECK', 'PREACHER_BENCH', 'CALF_RAISE_MACHINE');

-- Exercicios: o texto livre vira a lista. "Máquina" e textos desconhecidos
-- ficam sem equipamento (o seed corrige a biblioteca padrao).
ALTER TABLE "exercises" ADD COLUMN "equipment_list" "Equipment"[] NOT NULL DEFAULT ARRAY[]::"Equipment"[];
UPDATE "exercises" SET "equipment_list" = CASE lower(trim("equipment"))
    WHEN 'barra' THEN ARRAY['BARBELL']::"Equipment"[]
    WHEN 'halteres' THEN ARRAY['DUMBBELL']::"Equipment"[]
    WHEN 'halter' THEN ARRAY['DUMBBELL']::"Equipment"[]
    WHEN 'polia' THEN ARRAY['CABLE']::"Equipment"[]
    WHEN 'smith' THEN ARRAY['SMITH']::"Equipment"[]
    WHEN 'peso corporal' THEN ARRAY['BODYWEIGHT']::"Equipment"[]
    WHEN 'kettlebell' THEN ARRAY['KETTLEBELL']::"Equipment"[]
    WHEN 'elástico' THEN ARRAY['RESISTANCE_BAND']::"Equipment"[]
    WHEN 'banco' THEN ARRAY['BENCH']::"Equipment"[]
    WHEN 'colchonete' THEN ARRAY['MAT']::"Equipment"[]
    ELSE ARRAY[]::"Equipment"[]
END;
ALTER TABLE "exercises" DROP COLUMN "equipment";
ALTER TABLE "exercises" RENAME COLUMN "equipment_list" TO "equipment";
ALTER TABLE "exercises" ALTER COLUMN "equipment" DROP DEFAULT;

-- Academias: os equipamentos comuns ja vem marcados.
ALTER TABLE "gyms" ADD COLUMN "equipment" "Equipment"[] DEFAULT ARRAY['DUMBBELL', 'BARBELL', 'BENCH', 'MAT', 'PULL_UP_BAR']::"Equipment"[];

-- Ficha: ate aqui so o profissional montava, entao as entradas existentes
-- ficam como adicionadas pelo profissional do aluno.
ALTER TABLE "workout_entries" ADD COLUMN "added_by_id" UUID;
UPDATE "workout_entries" AS e SET "added_by_id" = u."professional_id"
FROM "users" AS u WHERE u."id" = e."user_id";

-- AddForeignKey
ALTER TABLE "workout_entries" ADD CONSTRAINT "workout_entries_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
