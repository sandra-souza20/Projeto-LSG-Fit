-- A biblioteca de exercicios passa a ser cadastrada so pela LSG FIT (seed):
-- os exercicios nao tem mais dono. Os que um profissional ja cadastrou
-- continuam na biblioteca.
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_created_by_professional_id_fkey";
ALTER TABLE "exercises" DROP COLUMN "created_by_professional_id";
