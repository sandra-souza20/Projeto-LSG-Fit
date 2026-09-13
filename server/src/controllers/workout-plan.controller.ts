import type { Request, Response } from "express";
import { GetWorkoutPlanService } from "../services/get-workout-plan.service.js";
import { UpdateWorkoutEntryService } from "../services/update-workout-entry.service.js";
import { handleError } from "../utils/app-error.js";

export class WorkoutPlanController {
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const getWorkoutPlan = new GetWorkoutPlanService();

            const plan = await getWorkoutPlan.execute(req.userId);

            return res.status(200).json(plan);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // O aluno so pode registrar a carga usada (RF: "Registrar Carga" no Caso de Uso).
    // Series, repeticoes e a montagem da ficha em si sao definidas pelo profissional
    // via ProfessionalWorkoutPlanController.
    async registerWeight(req: Request, res: Response): Promise<Response> {
        try {
            const updateWorkoutEntry = new UpdateWorkoutEntryService();

            const entry = await updateWorkoutEntry.execute({
                id: req.params.id as string,
                userId: req.userId,
                weight: req.body.weight,
            });

            return res.status(200).json(entry);
        } catch (error) {
            return handleError(error, res);
        }
    }
}
