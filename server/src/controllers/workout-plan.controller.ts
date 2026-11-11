import type { Request, Response } from "express";
import { GetWorkoutPlanService } from "../services/get-workout-plan.service.js";
import { AddWorkoutEntryService } from "../services/add-workout-entry.service.js";
import { UpdateWorkoutEntryService } from "../services/update-workout-entry.service.js";
import { DeleteWorkoutEntryService } from "../services/delete-workout-entry.service.js";
import { handleError } from "../utils/app-error.js";

// Ficha do proprio aluno. O aluno monta a ficha como o profissional: adiciona,
// edita e remove exercicios. Os dois editam a mesma ficha, e cada exercicio
// guarda quem o adicionou (addedBy).
export class WorkoutPlanController {
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const plan = await new GetWorkoutPlanService().execute(req.userId);

            return res.status(200).json(plan);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async create(req: Request, res: Response): Promise<Response> {
        try {
            const entry = await new AddWorkoutEntryService().execute({
                ...req.body,
                userId: req.userId,
                addedById: req.userId,
            });

            return res.status(201).json(entry);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Series, repeticoes, carga e descanso (antes o aluno so mudava a carga).
    async update(req: Request, res: Response): Promise<Response> {
        try {
            const entry = await new UpdateWorkoutEntryService().execute({
                ...req.body,
                id: req.params.id as string,
                userId: req.userId,
            });

            return res.status(200).json(entry);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async remove(req: Request, res: Response): Promise<Response> {
        try {
            await new DeleteWorkoutEntryService().execute({ id: req.params.id as string, userId: req.userId });

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }
}
