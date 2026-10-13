import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { ListExercisesService } from "../services/list-exercises.service.js";
import { CreateExerciseService } from "../services/create-exercise.service.js";
import { AppError, handleError } from "../utils/app-error.js";

export class ExercisesController {
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const listExercises = new ListExercisesService();

            const muscleGroup = typeof req.query.muscleGroup === "string" ? req.query.muscleGroup : undefined;
            const exercises = await listExercises.execute({ muscleGroup });

            return res.status(200).json(exercises);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async create(req: Request, res: Response): Promise<Response> {
        try {
            const createExercise = new CreateExerciseService();

            const exercise = await createExercise.execute({ ...req.body, professionalId: req.userId });

            return res.status(201).json(exercise);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // So o profissional que cadastrou pode remover; a biblioteca padrao
    // (seed) nao tem dono e nao pode ser apagada pelo app.
    async remove(req: Request, res: Response): Promise<Response> {
        try {
            const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id as string } });

            if (!exercise || exercise.createdByProfessionalId !== req.userId) {
                throw new AppError("Exercício não encontrado.", 404);
            }

            const inUse = await prisma.workoutEntry.count({ where: { exerciseId: exercise.id } });

            if (inUse) {
                throw new AppError("Esse exercício está na ficha de algum aluno e não pode ser removido.");
            }

            await prisma.exercise.delete({ where: { id: exercise.id } });

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }
}
