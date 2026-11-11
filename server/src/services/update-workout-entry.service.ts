import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { usesLoad } from "../utils/equipment.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { serializeWorkoutEntry, studentGymEquipment, WORKOUT_ENTRY_INCLUDE } from "./get-workout-plan.service.js";

type IRequestDto = {
    id: string;
    userId: string;
    sets?: number;
    reps?: number;
    weight?: number | null;
    restSeconds?: number | null;
};

export class UpdateWorkoutEntryService {
    async execute(dto: IRequestDto) {
        // Id que nao e UUID: o Postgres recusaria a consulta (erro 500).
        const entry = UUID_PATTERN.test(dto.id)
            ? await prisma.workoutEntry.findUnique({ where: { id: dto.id }, include: { exercise: { select: { equipment: true } } } })
            : null;

        if (!entry || entry.userId !== dto.userId) {
            throw new AppError("Exercício do treino não encontrado.", 404);
        }

        if (dto.sets !== undefined && dto.sets < 1) {
            throw new AppError("Informe um número de séries válido.");
        }

        if (dto.reps !== undefined && dto.reps < 1) {
            throw new AppError("Informe um número de repetições válido.");
        }

        if (dto.weight !== undefined && dto.weight !== null && dto.weight < 0) {
            throw new AppError("Informe um peso válido.");
        }

        if (dto.restSeconds !== undefined && dto.restSeconds !== null && dto.restSeconds < 0) {
            throw new AppError("Informe um tempo de descanso válido.");
        }

        const updated = await prisma.workoutEntry.update({
            where: { id: dto.id },
            data: {
                sets: dto.sets ?? entry.sets,
                reps: dto.reps ?? entry.reps,
                // Peso corporal nao tem carga.
                weight: !usesLoad(entry.exercise.equipment) ? null : dto.weight !== undefined ? dto.weight : entry.weight,
                restSeconds: dto.restSeconds !== undefined ? dto.restSeconds : entry.restSeconds,
            },
            include: WORKOUT_ENTRY_INCLUDE,
        });

        return serializeWorkoutEntry(updated, await studentGymEquipment(dto.userId));
    }
}
