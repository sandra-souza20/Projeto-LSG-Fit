import { prisma } from "../database/prisma.js";
import type { Weekday } from "../../prisma/client/enums.js";

export const WEEKDAYS: Weekday[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];

export class GetWorkoutPlanService {
    async execute(userId: string) {
        const entries = await prisma.workoutEntry.findMany({
            where: { userId },
            include: { exercise: true },
            orderBy: [{ dayOfWeek: "asc" }, { order: "asc" }],
        });

        return WEEKDAYS.map((dayOfWeek) => ({
            dayOfWeek,
            entries: entries
                .filter((entry) => entry.dayOfWeek === dayOfWeek)
                .map((entry) => ({
                    id: entry.id,
                    sets: entry.sets,
                    reps: entry.reps,
                    weight: entry.weight,
                    restSeconds: entry.restSeconds,
                    order: entry.order,
                    exercise: entry.exercise,
                })),
        }));
    }
}
