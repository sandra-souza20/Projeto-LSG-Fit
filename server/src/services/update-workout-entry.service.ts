import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

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
        const entry = await prisma.workoutEntry.findUnique({ where: { id: dto.id } });

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

        return prisma.workoutEntry.update({
            where: { id: dto.id },
            data: {
                sets: dto.sets ?? entry.sets,
                reps: dto.reps ?? entry.reps,
                weight: dto.weight !== undefined ? dto.weight : entry.weight,
                restSeconds: dto.restSeconds !== undefined ? dto.restSeconds : entry.restSeconds,
            },
            include: { exercise: true },
        });
    }
}
