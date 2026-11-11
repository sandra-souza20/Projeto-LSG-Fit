import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import {
    CHECK_IN_INCLUDE,
    hasTrainedToday,
    publishCheckIn,
    serializeCheckIn,
    todayCheckIn,
} from "../services/check-ins.service.js";
import { AppError, handleError } from "../utils/app-error.js";

// Check-in do aluno (app mobile). So o aluno matriculado faz check-in; a
// academia aprova ou nega no painel web.
async function studentEnrollment(userId: string) {
    return prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
            gymId: true,
            gymInactivatedAt: true,
            gymInactiveReason: true,
            gym: { select: { id: true, name: true } },
        },
    });
}

function inactiveBody(reason: string | null) {
    return {
        message: `Sua matrícula está inativa. Motivo: ${reason ?? "não informado"}. Fale com a sua academia.`,
        code: "STUDENT_INACTIVE",
        reason,
    };
}

export class CheckInsController {
    // Situacao de hoje: se precisa de check-in, se esta inativo e o ultimo pedido.
    async today(req: Request, res: Response): Promise<Response> {
        try {
            const enrollment = await studentEnrollment(req.userId);
            const [checkIn, trainedToday] = await Promise.all([
                enrollment.gymId ? todayCheckIn(req.userId) : null,
                hasTrainedToday(req.userId),
            ]);

            return res.status(200).json({
                // Sem academia nao ha check-in: o aluno treina direto.
                required: enrollment.gymId !== null,
                gym: enrollment.gym,
                inactive: enrollment.gymInactivatedAt
                    ? { reason: enrollment.gymInactiveReason, since: enrollment.gymInactivatedAt }
                    : null,
                checkIn: checkIn && checkIn.gymId === enrollment.gymId ? serializeCheckIn(checkIn) : null,
                trainedToday,
            });
        } catch (error) {
            return handleError(error, res);
        }
    }

    async create(req: Request, res: Response): Promise<Response> {
        try {
            const enrollment = await studentEnrollment(req.userId);

            if (!enrollment.gymId) {
                throw new AppError("Você não está matriculado em nenhuma academia. Não é preciso fazer check-in.", 400, "NO_GYM");
            }

            if (enrollment.gymInactivatedAt) {
                return res.status(403).json(inactiveBody(enrollment.gymInactiveReason));
            }

            if (await hasTrainedToday(req.userId)) {
                throw new AppError(
                    "Você já concluiu o treino de hoje. O próximo fica disponível amanhã.",
                    409,
                    "ALREADY_TRAINED_TODAY",
                );
            }

            const current = await todayCheckIn(req.userId);

            if (current?.gymId === enrollment.gymId && current.status === "PENDING") {
                throw new AppError("Seu check-in já está aguardando a aprovação da academia.", 409, "CHECK_IN_PENDING");
            }

            if (current?.gymId === enrollment.gymId && current.status === "APPROVED" && !current.workoutSessionId) {
                throw new AppError("Seu check-in de hoje já foi aprovado. Bom treino!", 409, "ALREADY_CHECKED_IN");
            }

            const created = await prisma.checkIn.create({
                data: { studentId: req.userId, gymId: enrollment.gymId },
                include: CHECK_IN_INCLUDE,
            });
            await publishCheckIn(created.id, "check-in.created");

            return res.status(201).json(serializeCheckIn(created));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // O aluno desiste do pedido ainda pendente.
    async cancel(req: Request, res: Response): Promise<Response> {
        try {
            const current = await todayCheckIn(req.userId);

            if (!current || current.status !== "PENDING") {
                throw new AppError("Não há check-in aguardando aprovação.", 404);
            }

            const { count } = await prisma.checkIn.updateMany({
                where: { id: current.id, status: "PENDING" },
                data: { status: "CANCELLED", decidedAt: new Date() },
            });

            if (count === 0) {
                throw new AppError("Esse check-in já foi respondido pela academia.", 409, "CHECK_IN_ALREADY_DECIDED");
            }

            await publishCheckIn(current.id, "check-in.updated");
            const updated = await prisma.checkIn.findUniqueOrThrow({ where: { id: current.id }, include: CHECK_IN_INCLUDE });

            return res.status(200).json(serializeCheckIn(updated));
        } catch (error) {
            return handleError(error, res);
        }
    }
}
