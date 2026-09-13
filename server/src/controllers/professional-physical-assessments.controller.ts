import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { CreatePhysicalAssessmentService } from "../services/create-physical-assessment.service.js";
import { ListPhysicalAssessmentsService } from "../services/list-physical-assessments.service.js";
import { AppError, handleError } from "../utils/app-error.js";

async function ensureOwnStudent(professionalId: string, studentId: string) {
    const student = await prisma.user.findUnique({ where: { id: studentId } });

    if (!student || student.professionalId !== professionalId) {
        throw new AppError("Aluno não encontrado.", 404);
    }
}

export class ProfessionalPhysicalAssessmentsController {
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const studentId = req.params.studentId as string;
            await ensureOwnStudent(req.userId, studentId);

            const listPhysicalAssessments = new ListPhysicalAssessmentsService();
            const assessments = await listPhysicalAssessments.execute(studentId);

            return res.status(200).json(assessments);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async create(req: Request, res: Response): Promise<Response> {
        try {
            const studentId = req.params.studentId as string;
            await ensureOwnStudent(req.userId, studentId);

            const createPhysicalAssessment = new CreatePhysicalAssessmentService();
            const assessment = await createPhysicalAssessment.execute({
                ...req.body,
                userId: studentId,
                recordedByProfessionalId: req.userId,
            });

            return res.status(201).json(assessment);
        } catch (error) {
            return handleError(error, res);
        }
    }
}
