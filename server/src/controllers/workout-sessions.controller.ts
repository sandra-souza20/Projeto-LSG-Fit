import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { AppError, handleError } from "../utils/app-error.js";
import { todayWeekday } from "../utils/app-day.js";
import { hasTrainedToday, todayCheckIn } from "../services/check-ins.service.js";
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

            // O treino do dia e o da ficha para o dia da semana de hoje (fuso do app).
            if (dayOfWeek !== todayWeekday()) {
                throw new AppError("Esse não é o treino de hoje.", 409, "NOT_TODAYS_WORKOUT");
            }

            const hasEntries = await prisma.workoutEntry.count({ where: { userId: req.userId, dayOfWeek } });

            if (!hasEntries) {
                throw new AppError("Esse treino não possui exercícios.");
            }

            // Um treino por dia (fuso do app).
            if (await hasTrainedToday(req.userId)) {
                throw new AppError(
                    "Você já concluiu o treino de hoje. O próximo fica disponível amanhã.",
                    409,
                    "ALREADY_TRAINED_TODAY",
                );
            }

            // Aluno matriculado: precisa de check-in aprovado hoje, ainda nao usado.
            const student = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { gymId: true } });
            const checkIn = student.gymId ? await todayCheckIn(req.userId) : null;

            if (student.gymId && !(checkIn?.status === "APPROVED" && checkIn.gymId === student.gymId && !checkIn.workoutSessionId)) {
                throw new AppError("Faça o check-in e aguarde a aprovação da academia para treinar.", 403, "CHECK_IN_REQUIRED");
            }

            const session = await prisma.$transaction(async (tx) => {
                const created = await tx.workoutSession.create({
                    data: { userId: req.userId, dayOfWeek },
                    select: { id: true, dayOfWeek: true, completedAt: true },
                });

                if (checkIn) {
                    // O check-in vale para um treino: fica ligado a este.
                    await tx.checkIn.update({ where: { id: checkIn.id }, data: { workoutSessionId: created.id } });
                }

                return created;
            });

            return res.status(201).json(session);
        } catch (error) {
            return handleError(error, res);
        }
    }
}
