import type { Request, Response } from "express";
import { CreatePhysicalAssessmentService } from "../services/create-physical-assessment.service.js";
import { ListPhysicalAssessmentsService } from "../services/list-physical-assessments.service.js";
import { handleError } from "../utils/app-error.js";

export class PhysicalAssessmentsController {
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const listPhysicalAssessments = new ListPhysicalAssessmentsService();

            const assessments = await listPhysicalAssessments.execute(req.userId);

            return res.status(200).json(assessments);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // O proprio aluno so registra a avaliacao em nome dele mesmo, sem vinculo
    // com nenhum profissional (recordedByProfessionalId fica nulo).
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const createPhysicalAssessment = new CreatePhysicalAssessmentService();

            const assessment = await createPhysicalAssessment.execute({ ...req.body, userId: req.userId });

            return res.status(201).json(assessment);
        } catch (error) {
            return handleError(error, res);
        }
    }
}
