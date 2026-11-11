import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { usesLoad } from "../utils/equipment.js";
import type { Weekday } from "../../prisma/client/enums.js";
import { serializeWorkoutEntry, studentGymEquipment, WORKOUT_ENTRY_INCLUDE } from "./get-workout-plan.service.js";

type IRequestDto = {
    userId: string;
    // Quem esta adicionando: o proprio aluno ou o profissional dele.
    addedById: string;
    exerciseId: string;
    dayOfWeek: Weekday;
    sets: number;
    reps: number;
    weight?: number | null;
    restSeconds?: number | null;
};

export class AddWorkoutEntryService {
    async execute(dto: IRequestDto) {
        if (!dto.sets || dto.sets < 1) {
            throw new AppError("Informe um número de séries válido.");
        }

        if (!dto.reps || dto.reps < 1) {
            throw new AppError("Informe um número de repetições válido.");
        }

        if (dto.weight !== undefined && dto.weight !== null && dto.weight < 0) {
            throw new AppError("Informe um peso válido.");
        }

        if (dto.restSeconds !== undefined && dto.restSeconds !== null && dto.restSeconds < 0) {
            throw new AppError("Informe um tempo de descanso válido.");
        }

        const exercise = await prisma.exercise.findUnique({ where: { id: dto.exerciseId } });

        if (!exercise) {
            throw new AppError("Exercício não encontrado.", 404);
        }

        const existingEntry = await prisma.workoutEntry.findUnique({
            where: {
                userId_exerciseId_dayOfWeek: {
                    userId: dto.userId,
                    exerciseId: dto.exerciseId,
                    dayOfWeek: dto.dayOfWeek,
                },
            },
        });

        if (existingEntry) {
            throw new AppError("Esse exercício já está no treino desse dia.");
        }

        const lastEntry = await prisma.workoutEntry.findFirst({
            where: { userId: dto.userId, dayOfWeek: dto.dayOfWeek },
            orderBy: { order: "desc" },
        });

        const created = await prisma.workoutEntry.create({
            data: {
                userId: dto.userId,
                exerciseId: dto.exerciseId,
                dayOfWeek: dto.dayOfWeek,
                sets: dto.sets,
                reps: dto.reps,
                // Peso corporal nao tem carga.
                weight: usesLoad(exercise.equipment) ? (dto.weight ?? null) : null,
                restSeconds: dto.restSeconds ?? null,
                order: (lastEntry?.order ?? -1) + 1,
                addedById: dto.addedById,
            },
            include: WORKOUT_ENTRY_INCLUDE,
        });

        return serializeWorkoutEntry(created, await studentGymEquipment(dto.userId));
    }
}
