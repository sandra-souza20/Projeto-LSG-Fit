import type { Request, Response } from "express";
import { CreateUserService } from "../services/create-user.service.js";
import { VerifyEmailService } from "../services/verify-email.service.js";
import { ResendVerificationCodeService } from "../services/resend-verification-code.service.js";
import { RequestPasswordResetService } from "../services/request-password-reset.service.js";
import { ResetPasswordService } from "../services/reset-password.service.js";
import { ActivateProfessionalService } from "../services/activate-professional.service.js";
import { AppError, handleError } from "../utils/app-error.js";
import { startUserSession } from "../utils/account-session.js";
import { serializeUser, USER_SELECT } from "../utils/serializers.js";
import { prisma } from "../database/prisma.js";

// Aluno e profissional (docs/contrato-api.md, secao 4).
export class UsersController {
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const createUser = new CreateUserService();

            const { user, message, startSession } = await createUser.execute(req.body ?? {});

            // Com EMAIL_VERIFICATION=off a conta ja nasce confirmada e entra direto.
            if (startSession) {
                const session = await startUserSession(req, res, user);
                return res.status(201).json({ user, message, ...session });
            }

            return res.status(201).json({ user, message });
        } catch (error) {
            return handleError(error, res);
        }
    }

    async me(req: Request, res: Response): Promise<Response> {
        try {
            const user = await prisma.user.findUnique({ where: { id: req.userId }, select: USER_SELECT });

            if (!user) {
                throw new AppError("Usuário não encontrado.", 404);
            }

            return res.status(200).json(serializeUser(user));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // RF04/RF05: o aluno atualiza as informacoes pessoais; o profissional
    // tambem edita especialidade e bio, exibidas na Pagina de Perfis.
    // gymId e role sao ignorados: o profissional nao troca de academia.
    async updateMe(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phone, specialty, bio } = (req.body ?? {}) as {
                name?: string;
                phone?: string | null;
                specialty?: string | null;
                bio?: string | null;
            };

            if (name !== undefined && !name?.trim()) {
                throw new AppError("Informe o seu nome.");
            }

            const isProfessional = req.userRole === "PROFESSIONAL";

            const user = await prisma.user.update({
                where: { id: req.userId },
                data: {
                    ...(name !== undefined ? { name: name.trim() } : {}),
                    ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
                    ...(isProfessional && specialty !== undefined ? { specialty: specialty?.trim() || null } : {}),
                    ...(isProfessional && bio !== undefined ? { bio: bio?.trim() || null } : {}),
                },
                select: USER_SELECT,
            });

            return res.status(200).json(serializeUser(user));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Relacao "Orienta" do DER: o aluno escolhe (ou troca) o profissional.
    // Enviar professionalId null desfaz o vinculo.
    async linkProfessional(req: Request, res: Response): Promise<Response> {
        try {
            const { professionalId } = (req.body ?? {}) as { professionalId?: string | null };

            if (professionalId === undefined) {
                throw new AppError("Informe o profissional.");
            }

            if (professionalId) {
                // So profissionais que ja ativaram a conta aparecem para o aluno.
                const professional = await prisma.user.findFirst({
                    where: { id: professionalId, role: "PROFESSIONAL", password: { not: null } },
                    select: { id: true },
                });

                if (!professional) {
                    throw new AppError("Profissional não encontrado.", 404);
                }
            }

            const user = await prisma.user.update({
                where: { id: req.userId },
                data: { professionalId: professionalId || null },
                select: USER_SELECT,
            });

            return res.status(200).json(serializeUser(user));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Relacao "Matricula" do DER: o aluno escolhe (ou troca) a academia em que treina.
    // Enviar gymId null cancela a matricula.
    async linkGym(req: Request, res: Response): Promise<Response> {
        try {
            const { gymId } = (req.body ?? {}) as { gymId?: string | null };

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
                    ...((gymId || null) !== current.gymId ? { gymEnrolledAt: gymId ? new Date() : null } : {}),
                },
                select: USER_SELECT,
            });

            return res.status(200).json(serializeUser(user));
        } catch (error) {
            return handleError(error, res);
        }
    }

    async verify(req: Request, res: Response): Promise<Response> {
        try {
            const verifyEmail = new VerifyEmailService();

            const { user } = await verifyEmail.execute(req.body ?? {});
            const session = await startUserSession(req, res, user);

            return res.status(200).json({ user, ...session });
        } catch (error) {
            return handleError(error, res);
        }
    }

    async resendVerification(req: Request, res: Response): Promise<Response> {
        try {
            const resendVerificationCode = new ResendVerificationCodeService();

            const result = await resendVerificationCode.execute(req.body ?? {});

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async forgotPassword(req: Request, res: Response): Promise<Response> {
        try {
            const requestPasswordReset = new RequestPasswordResetService();

            const result = await requestPasswordReset.execute(req.body ?? {});

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Redefinir a senha derruba as outras sessoes da conta (secao 2.5).
    async resetPassword(req: Request, res: Response): Promise<Response> {
        try {
            const resetPassword = new ResetPasswordService();

            const { user } = await resetPassword.execute(req.body ?? {});
            const session = await startUserSession(req, res, user, { revokeOthers: true });

            return res.status(200).json({ user, ...session });
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Primeiro acesso do profissional: cria a senha com o codigo de convite.
    async activate(req: Request, res: Response): Promise<Response> {
        try {
            const activateProfessional = new ActivateProfessionalService();

            const { user } = await activateProfessional.execute(req.body ?? {});
            const session = await startUserSession(req, res, user, { revokeOthers: true });

            return res.status(200).json({ user, ...session });
        } catch (error) {
            return handleError(error, res);
        }
    }
}
