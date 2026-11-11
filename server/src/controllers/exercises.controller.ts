import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { ListExercisesService } from "../services/list-exercises.service.js";
import { handleError } from "../utils/app-error.js";
import { ensureOwnStudent } from "../utils/own-student.js";
import { studentGymEquipment } from "../services/get-workout-plan.service.js";
import type { Equipment } from "../../prisma/client/enums.js";

// Academia usada para dizer se cada exercicio esta disponivel:
// - aluno: a academia dele;
// - profissional com ?studentId=: a academia desse aluno (precisa ser aluno dele);
// - membro da academia: a propria academia;
// - nos outros casos, nenhuma (availableAtGym = null).
async function gymEquipmentFor(req: Request): Promise<Equipment[] | null> {
    if (req.userRole === "STUDENT") return studentGymEquipment(req.userId);

    if (req.userRole === "PROFESSIONAL" && typeof req.query.studentId === "string") {
        await ensureOwnStudent(req.userId, req.query.studentId);
        return studentGymEquipment(req.query.studentId);
    }

    if (req.userRole === "GYM") {
        const gym = await prisma.gym.findUnique({ where: { id: req.gymId }, select: { equipment: true } });
        return gym?.equipment ?? null;
    }

    return null;
}

export class ExercisesController {
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const listExercises = new ListExercisesService();

            const muscleGroup = typeof req.query.muscleGroup === "string" ? req.query.muscleGroup : undefined;
            const exercises = await listExercises.execute({ muscleGroup, gymEquipment: await gymEquipmentFor(req) });

            return res.status(200).json(exercises);
        } catch (error) {
            return handleError(error, res);
        }
    }
}
