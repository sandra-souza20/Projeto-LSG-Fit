import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { AppError, handleError } from "../utils/app-error.js";
import { WEEKDAYS } from "../services/get-workout-plan.service.js";
import type { Weekday } from "../../prisma/client/enums.js";

// Le o intervalo ?from=&to= (ISO). O app manda o inicio e o fim do mes no fuso
// do aparelho, assim o servidor nao precisa saber o fuso horario do aluno.
export function parseRange(query: Request["query"]) {
    const from = typeof query.from === "string" ? new Date(query.from) : null;
    const to = typeof query.to === "string" ? new Date(query.to) : null;

    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
        throw new AppError("Informe um período válido.");
    }

    return { from, to };
}

export async function listSessionsInRange(userId: string, query: Request["query"]) {
    const { from, to } = parseRange(query);

    return prisma.workoutSession.findMany({
        where: { userId, completedAt: { gte: from, lte: to } },
        select: { id: true, dayOfWeek: true, completedAt: true },
        orderBy: { completedAt: "asc" },
    });
}

export class WorkoutSessionsController {
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const sessions = await listSessionsInRange(req.userId, req.query);

            return res.status(200).json(sessions);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Chamado quando o aluno toca em "Finalizar treino" na tela de execucao.
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const { dayOfWeek } = req.body as { dayOfWeek: Weekday };

            if (!WEEKDAYS.includes(dayOfWeek)) {
                throw new AppError("Treino inválido.");
            }

            const hasEntries = await prisma.workoutEntry.count({ where: { userId: req.userId, dayOfWeek } });

            if (!hasEntries) {
                throw new AppError("Esse treino não possui exercícios.");
            }

            const session = await prisma.workoutSession.create({
                data: { userId: req.userId, dayOfWeek },
                select: { id: true, dayOfWeek: true, completedAt: true },
            });

            return res.status(201).json(session);
        } catch (error) {
            return handleError(error, res);
        }
    }
}
