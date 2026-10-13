import type { Request, Response } from "express";
import { CreateProfessionalService } from "../services/create-professional.service.js";
import { AuthenticateProfessionalService } from "../services/authenticate-professional.service.js";
import { AppError, handleError } from "../utils/app-error.js";
import { prisma } from "../database/prisma.js";
import { listSessionsInRange } from "./workout-sessions.controller.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function serializeProfessional(professional: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    specialty: string | null;
    bio: string | null;
    gymId: string | null;
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        id: professional.id,
        name: professional.name,
        email: professional.email,
        phone: professional.phone,
        specialty: professional.specialty,
        bio: professional.bio,
        gymId: professional.gymId,
        createdAt: professional.createdAt,
        updatedAt: professional.updatedAt,
    };
}

export class ProfessionalsController {
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const createProfessional = new CreateProfessionalService();

            const result = await createProfessional.execute(req.body);

            return res.status(201).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async login(req: Request, res: Response): Promise<Response> {
        try {
            const authenticateProfessional = new AuthenticateProfessionalService();

            const result = await authenticateProfessional.execute(req.body);

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async me(req: Request, res: Response): Promise<Response> {
        const professional = await prisma.professional.findUniqueOrThrow({ where: { id: req.userId } });

        return res.status(200).json(serializeProfessional(professional));
    }

    // Dados exibidos para os alunos na Pagina de Perfis (RF05).
    async updateMe(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phone, specialty, bio, gymId } = req.body as {
                name?: string;
                phone?: string | null;
                specialty?: string | null;
                bio?: string | null;
                gymId?: string | null;
            };

            if (name !== undefined && !name.trim()) {
                throw new AppError("Informe o seu nome.");
            }

            if (gymId) {
                const gym = await prisma.gym.findUnique({ where: { id: gymId } });

                if (!gym) {
                    throw new AppError("Academia não encontrada.", 404);
                }
            }

            const professional = await prisma.professional.update({
                where: { id: req.userId },
                data: {
                    ...(name !== undefined ? { name: name.trim() } : {}),
                    ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
                    ...(specialty !== undefined ? { specialty: specialty?.trim() || null } : {}),
                    ...(bio !== undefined ? { bio: bio?.trim() || null } : {}),
                    ...(gymId !== undefined ? { gymId: gymId || null } : {}),
                },
            });

            return res.status(200).json(serializeProfessional(professional));
        } catch (error) {
            return handleError(error, res);
        }
    }

    async listAll(req: Request, res: Response): Promise<Response> {
        const professionals = await prisma.professional.findMany({
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
    }

    // Lista os alunos com um resumo da frequencia, para o profissional ter
    // "maior controle sobre a frequencia dos alunos" (Fase 4 do projeto).
    async students(req: Request, res: Response): Promise<Response> {
        const since = new Date(Date.now() - THIRTY_DAYS_MS);

        const students = await prisma.user.findMany({
            where: { professionalId: req.userId },
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
