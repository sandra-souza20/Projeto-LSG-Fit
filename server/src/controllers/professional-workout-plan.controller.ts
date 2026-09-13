import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { GetWorkoutPlanService } from "../services/get-workout-plan.service.js";
import { AddWorkoutEntryService } from "../services/add-workout-entry.service.js";
import { UpdateWorkoutEntryService } from "../services/update-workout-entry.service.js";
import { DeleteWorkoutEntryService } from "../services/delete-workout-entry.service.js";
import { AppError, handleError } from "../utils/app-error.js";

async function ensureOwnStudent(professionalId: string, studentId: string) {
    const student = await prisma.user.findUnique({ where: { id: studentId } });

    if (!student || student.professionalId !== professionalId) {
        throw new AppError("Aluno não encontrado.", 404);
    }

    return student;
}

export class ProfessionalWorkoutPlanController {
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const studentId = req.params.studentId as string;
            await ensureOwnStudent(req.userId, studentId);

            const getWorkoutPlan = new GetWorkoutPlanService();
            const plan = await getWorkoutPlan.execute(studentId);

            return res.status(200).json(plan);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async create(req: Request, res: Response): Promise<Response> {
        try {
            const studentId = req.params.studentId as string;
            await ensureOwnStudent(req.userId, studentId);

            const addWorkoutEntry = new AddWorkoutEntryService();
            const entry = await addWorkoutEntry.execute({ ...req.body, userId: studentId });

            return res.status(201).json(entry);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async update(req: Request, res: Response): Promise<Response> {
        try {
            const studentId = req.params.studentId as string;
            await ensureOwnStudent(req.userId, studentId);

            const updateWorkoutEntry = new UpdateWorkoutEntryService();
            const entry = await updateWorkoutEntry.execute({
                ...req.body,
                id: req.params.id as string,
                userId: studentId,
            });

            return res.status(200).json(entry);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async remove(req: Request, res: Response): Promise<Response> {
        try {
            const studentId = req.params.studentId as string;
            await ensureOwnStudent(req.userId, studentId);

            const deleteWorkoutEntry = new DeleteWorkoutEntryService();
            await deleteWorkoutEntry.execute({ id: req.params.id as string, userId: studentId });

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }
}
