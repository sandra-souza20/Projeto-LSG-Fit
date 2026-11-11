import { prisma } from "../database/prisma.js";
import type { Equipment } from "../../prisma/client/enums.js";
import { serializeExercise } from "../utils/equipment.js";

type IRequestDto = {
    muscleGroup?: string | undefined;
    // Equipamentos da academia usada para calcular `availableAtGym` (null = sem academia).
    gymEquipment: Equipment[] | null;
};

export class ListExercisesService {
    async execute(dto: IRequestDto) {
        const exercises = await prisma.exercise.findMany({
            ...(dto.muscleGroup ? { where: { muscleGroup: dto.muscleGroup } } : {}),
            orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
        });

        return exercises.map((exercise) => serializeExercise(exercise, dto.gymEquipment));
    }
}
