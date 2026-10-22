import type { Request, Response } from "express";
import { CreateUserService } from "../services/create-user.service.js";
import { VerifyEmailService } from "../services/verify-email.service.js";
import { ResendVerificationCodeService } from "../services/resend-verification-code.service.js";
import { RequestPasswordResetService } from "../services/request-password-reset.service.js";
import { ResetPasswordService } from "../services/reset-password.service.js";
import { AppError, handleError } from "../utils/app-error.js";
import { prisma } from "../database/prisma.js";

const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    professionalId: true,
    gymId: true,
    gymEnrolledAt: true,
    gym: { select: { id: true, name: true } },
    createdAt: true,
    updatedAt: true,
} as const;

export class UsersController {
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const createUser = new CreateUserService();

            const result = await createUser.execute(req.body as any);

            return res.status(201).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async me(req: Request, res: Response): Promise<Response> {
        const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: USER_SELECT });

        return res.status(200).json(user);
    }

    // RF04: o aluno pode atualizar as informacoes pessoais exibidas no perfil.
    async updateMe(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phone } = req.body as { name?: string; phone?: string | null };

            if (name !== undefined && !name.trim()) {
                throw new AppError("Informe o seu nome.");
            }

            const user = await prisma.user.update({
                where: { id: req.userId },
                data: {
                    ...(name !== undefined ? { name: name.trim() } : {}),
                    ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
                },
                select: USER_SELECT,
            });

            return res.status(200).json(user);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async linkProfessional(req: Request, res: Response): Promise<Response> {
        try {
            const { professionalId } = req.body as { professionalId: string | null };

            if (professionalId) {
                const professional = await prisma.professional.findUnique({ where: { id: professionalId } });

                if (!professional) {
                    throw new AppError("Profissional não encontrado.", 404);
                }
            }

            const user = await prisma.user.update({
                where: { id: req.userId },
                data: { professionalId: professionalId ?? null },
            });

            return res.status(200).json({
                id: user.id,
                name: user.name,
                email: user.email,
                professionalId: user.professionalId,
            });
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Relacao "Matricula" do DER: o aluno escolhe (ou troca) a academia em que treina.
    // Enviar gymId null cancela a matricula.
    async linkGym(req: Request, res: Response): Promise<Response> {
        try {
            const { gymId } = req.body as { gymId?: string | null };

            if (gymId === undefined) {
                throw new AppError("Informe a academia.");
            }

            if (gymId) {
                const gym = await prisma.gym.findUnique({ where: { id: gymId } });

                if (!gym) {
                    throw new AppError("Academia não encontrada.", 404);
                }
            }

            const current = await prisma.user.findUniqueOrThrow({
                where: { id: req.userId },
                select: { gymId: true },
            });

            const user = await prisma.user.update({
                where: { id: req.userId },
                data: {
                    gymId: gymId || null,
                    // A data so muda quando o aluno entra numa academia diferente.
                    ...(gymId !== current.gymId ? { gymEnrolledAt: gymId ? new Date() : null } : {}),
                },
                select: USER_SELECT,
            });

            return res.status(200).json(user);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async verify(req: Request, res: Response): Promise<Response> {
        try {
            const verifyEmail = new VerifyEmailService();

            const result = await verifyEmail.execute(req.body);

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async resendVerification(req: Request, res: Response): Promise<Response> {
        try {
            const resendVerificationCode = new ResendVerificationCodeService();

            const result = await resendVerificationCode.execute(req.body);

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async forgotPassword(req: Request, res: Response): Promise<Response> {
        try {
            const requestPasswordReset = new RequestPasswordResetService();

            const result = await requestPasswordReset.execute(req.body);

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async resetPassword(req: Request, res: Response): Promise<Response> {
        try {
            const resetPassword = new ResetPasswordService();

            const result = await resetPassword.execute(req.body);

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }
}
