import type { Request, Response } from "express";
import { AppError, handleError } from "../utils/app-error.js";
import { prisma } from "../database/prisma.js";
import { listSessionsInRange } from "./workout-sessions.controller.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// O perfil do proprio profissional fica em /users/me (docs/contrato-api.md, secao 4).
export class ProfessionalsController {
    // Pagina de Perfis (RF05): so profissionais que ja ativaram a conta.
    async listAll(req: Request, res: Response): Promise<Response> {
        try {
            const professionals = await prisma.user.findMany({
                where: { role: "PROFESSIONAL", password: { not: null } },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    specialty: true,
                    bio: true,
                    gymId: true,
                    gym: { select: { id: true, name: true } },
                    _count: { select: { students: true } },
                },
                orderBy: { name: "asc" },
            });

            return res.status(200).json(
                professionals.map(({ _count, ...professional }) => ({
                    ...professional,
                    studentsCount: _count.students,
                })),
            );
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Lista os alunos com um resumo da frequencia, para o profissional ter
    // "maior controle sobre a frequencia dos alunos" (Fase 4 do projeto).
    async students(req: Request, res: Response): Promise<Response> {
        const since = new Date(Date.now() - THIRTY_DAYS_MS);

        const students = await prisma.user.findMany({
            where: { professionalId: req.userId, role: "STUDENT" },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                workoutSessions: {
                    select: { completedAt: true },
                    orderBy: { completedAt: "desc" },
                    take: 1,
                },
                _count: { select: { workoutSessions: { where: { completedAt: { gte: since } } } } },
            },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(
            students.map(({ workoutSessions, _count, ...student }) => ({
                ...student,
                lastWorkoutAt: workoutSessions[0]?.completedAt ?? null,
                workoutsLast30Days: _count.workoutSessions,
            })),
        );
    }

    async studentWorkoutSessions(req: Request, res: Response): Promise<Response> {
        try {
            const studentId = req.params.studentId as string;
            const student = await prisma.user.findUnique({ where: { id: studentId } });

            if (!student || student.professionalId !== req.userId) {
                throw new AppError("Aluno não encontrado.", 404);
            }

            const sessions = await listSessionsInRange(studentId, req.query);

            return res.status(200).json(sessions);
        } catch (error) {
            return handleError(error, res);
        }
    }
}
