import type { Request, Response } from "express";
import { CreateGymService } from "../services/create-gym.service.js";
import { AuthenticateGymService } from "../services/authenticate-gym.service.js";
import { RequestGymPasswordResetService } from "../services/request-gym-password-reset.service.js";
import { ResetGymPasswordService } from "../services/reset-gym-password.service.js";
import {
    CreateGymProfessionalService,
    GYM_PROFESSIONAL_SELECT,
    serializeGymProfessional,
} from "../services/create-gym-professional.service.js";
import { SendProfessionalInviteService } from "../services/send-professional-invite.service.js";
import { AppError, handleError } from "../utils/app-error.js";
import { startGymSession } from "../utils/account-session.js";
import { serializeGym } from "../utils/serializers.js";
import { revokeAllSessions } from "../utils/session.js";
import { prisma } from "../database/prisma.js";
import { listSessionsInRange, parseRange } from "./workout-sessions.controller.js";

async function findGymProfessional(gymId: string, professionalId: string) {
    const professional = await prisma.user.findFirst({
        where: { id: professionalId, gymId, role: "PROFESSIONAL" },
        select: { id: true },
    });

    if (!professional) {
        throw new AppError("Profissional não encontrado nesta academia.", 404);
    }

    return professional;
}

export class GymsController {
    // Cadastro livre: ja entra, sem "lembrar deste dispositivo".
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const createGym = new CreateGymService();

            const { gym } = await createGym.execute(req.body ?? {});
            const session = await startGymSession(req, res, gym, { remember: false });

            return res.status(201).json({ gym, ...session });
        } catch (error) {
            return handleError(error, res);
        }
    }

    async login(req: Request, res: Response): Promise<Response> {
        try {
            const authenticateGym = new AuthenticateGymService();

            const { gym } = await authenticateGym.execute(req.body ?? {});
            const session = await startGymSession(req, res, gym, { remember: req.body?.rememberDevice === true });

            return res.status(200).json({ gym, ...session });
        } catch (error) {
            return handleError(error, res);
        }
    }

    async forgotPassword(req: Request, res: Response): Promise<Response> {
        try {
            const requestGymPasswordReset = new RequestGymPasswordResetService();

            const result = await requestGymPasswordReset.execute(req.body ?? {});

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Redefinir a senha derruba as outras sessoes da academia (secao 2.5).
    async resetPassword(req: Request, res: Response): Promise<Response> {
        try {
            const resetGymPassword = new ResetGymPasswordService();

            const { gym } = await resetGymPassword.execute(req.body ?? {});
            const session = await startGymSession(req, res, gym, { remember: false, revokeOthers: true });

            return res.status(200).json({ gym, ...session });
        } catch (error) {
            return handleError(error, res);
        }
    }

    async me(req: Request, res: Response): Promise<Response> {
        try {
            const gym = await prisma.gym.findUnique({ where: { id: req.userId } });

            if (!gym) {
                throw new AppError("Academia não encontrada.", 404);
            }

            return res.status(200).json(serializeGym(gym));
        } catch (error) {
            return handleError(error, res);
        }
    }

    async updateMe(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phone, address } = (req.body ?? {}) as {
                name?: string;
                phone?: string | null;
                address?: string | null;
            };

            if (name !== undefined && !name.trim()) {
                throw new AppError("Informe o nome da academia.");
            }

            const gym = await prisma.gym.update({
                where: { id: req.userId },
                data: {
                    ...(name !== undefined ? { name: name.trim() } : {}),
                    ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
                    ...(address !== undefined ? { address: address?.trim() || null } : {}),
                },
            });

            return res.status(200).json(serializeGym(gym));
        } catch (error) {
            return handleError(error, res);
        }
    }

    async listAll(req: Request, res: Response): Promise<Response> {
        const gyms = await prisma.gym.findMany({
            select: { id: true, name: true, email: true, phone: true, address: true },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(gyms);
    }

    // Profissionais contratados por esta academia (relacao "Contrata" do DER),
    // incluindo os que ainda nao ativaram a conta.
    async professionals(req: Request, res: Response): Promise<Response> {
        try {
            const professionals = await prisma.user.findMany({
                where: { gymId: req.userId, role: "PROFESSIONAL" },
                select: GYM_PROFESSIONAL_SELECT,
                orderBy: { name: "asc" },
            });

            return res.status(200).json(professionals.map(serializeGymProfessional));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // So a academia cadastra profissionais; o profissional recebe um convite.
    async createProfessional(req: Request, res: Response): Promise<Response> {
        try {
            const createGymProfessional = new CreateGymProfessionalService();

            const professional = await createGymProfessional.execute({ ...(req.body ?? {}), gymId: req.userId });

            return res.status(201).json(professional);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async resendProfessionalInvite(req: Request, res: Response): Promise<Response> {
        try {
            const professional = await findGymProfessional(req.userId, req.params.professionalId as string);

            await new SendProfessionalInviteService().execute(professional.id);

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Apaga a conta do profissional: os alunos dele ficam sem profissional
    // (onDelete SetNull) e as sessoes abertas dele sao derrubadas.
    async removeProfessional(req: Request, res: Response): Promise<Response> {
        try {
            const professional = await findGymProfessional(req.userId, req.params.professionalId as string);

            await prisma.user.delete({ where: { id: professional.id } });
            await revokeAllSessions("user", professional.id);

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Relacao "Matricula" do DER: alunos que treinam nesta academia, com a
    // frequencia (caso de uso "Verificar Frequencia"). Com ?from=&to= conta os
    // treinos do periodo; lastWorkoutAt permite achar os alunos ausentes.
    // RNF05: a academia ve contato, vinculo e datas de treino, nunca a ficha
    // de treino nem as avaliacoes fisicas do aluno.
    async students(req: Request, res: Response): Promise<Response> {
        try {
            const range = req.query.from || req.query.to ? parseRange(req.query) : null;

            const students = await prisma.user.findMany({
                where: { gymId: req.userId, role: "STUDENT" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    gymEnrolledAt: true,
                    professional: { select: { id: true, name: true } },
                    workoutSessions: {
                        select: { completedAt: true },
                        orderBy: { completedAt: "desc" },
                        take: 1,
                    },
                    _count: {
                        select: {
                            workoutSessions: {
                                where: range ? { completedAt: { gte: range.from, lte: range.to } } : {},
                            },
                        },
                    },
                },
                orderBy: { name: "asc" },
            });

            return res.status(200).json(
                students.map(({ workoutSessions, _count, ...student }) => ({
                    ...student,
                    lastWorkoutAt: workoutSessions[0]?.completedAt ?? null,
                    ...(range ? { workoutsInRange: _count.workoutSessions } : {}),
                })),
            );
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Calendario de frequencia de um aluno matriculado nesta academia.
    async studentWorkoutSessions(req: Request, res: Response): Promise<Response> {
        try {
            const student = await prisma.user.findFirst({
                where: { id: req.params.studentId as string, gymId: req.userId, role: "STUDENT" },
                select: { id: true },
            });

            if (!student) {
                throw new AppError("Aluno não encontrado nesta academia.", 404);
            }

            const sessions = await listSessionsInRange(student.id, req.query);

            return res.status(200).json(sessions);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // A academia cancela a matricula de um aluno que saiu. O vinculo com o
    // profissional nao muda: o personal pode continuar atendendo o aluno.
    async removeStudent(req: Request, res: Response): Promise<Response> {
        try {
            const { count } = await prisma.user.updateMany({
                where: { id: req.params.studentId as string, gymId: req.userId, role: "STUDENT" },
                data: { gymId: null, gymEnrolledAt: null },
            });

            if (count === 0) {
                throw new AppError("Aluno não encontrado nesta academia.", 404);
            }

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }
}
