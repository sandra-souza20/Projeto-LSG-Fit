import { prisma } from "../database/prisma.js";
import type { Equipment, Weekday } from "../../prisma/client/enums.js";
import { serializeExercise } from "../utils/equipment.js";

export const WEEKDAYS: Weekday[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];

// Ficha completa no formato da API. Junto vai quem adicionou cada exercicio
// e se ele existe na academia do aluno.
export const WORKOUT_ENTRY_INCLUDE = {
    exercise: true,
    addedBy: { select: { id: true, name: true, role: true } },
} as const;

type EntryRecord = {
    id: string;
    sets: number;
    reps: number;
    weight: number | null;
    restSeconds: number | null;
    order: number;
    exercise: Parameters<typeof serializeExercise>[0];
    addedBy: { id: string; name: string; role: "STUDENT" | "PROFESSIONAL" } | null;
};

export function serializeWorkoutEntry(entry: EntryRecord, gymEquipment: Equipment[] | null) {
    return {
        id: entry.id,
        sets: entry.sets,
        reps: entry.reps,
        weight: entry.weight,
        restSeconds: entry.restSeconds,
        order: entry.order,
        exercise: serializeExercise(entry.exercise, gymEquipment),
        addedBy: entry.addedBy,
    };
}

/** Equipamentos da academia do aluno (null se ele nao tiver academia). */
export async function studentGymEquipment(studentId: string): Promise<Equipment[] | null> {
    const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { gym: { select: { equipment: true } } },
    });

    return student?.gym?.equipment ?? null;
}

export class GetWorkoutPlanService {
    async execute(userId: string) {
        const [entries, gymEquipment] = await Promise.all([
            prisma.workoutEntry.findMany({
                where: { userId },
                include: WORKOUT_ENTRY_INCLUDE,
                orderBy: [{ dayOfWeek: "asc" }, { order: "asc" }],
            }),
            studentGymEquipment(userId),
        ]);

        return WEEKDAYS.map((dayOfWeek) => ({
            dayOfWeek,
            entries: entries
                .filter((entry) => entry.dayOfWeek === dayOfWeek)
                .map((entry) => serializeWorkoutEntry(entry, gymEquipment)),
        }));
    }
}
