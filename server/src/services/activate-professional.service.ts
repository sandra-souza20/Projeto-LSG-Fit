import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { findAuthToken, INVALID_LINK_MESSAGE } from "../utils/auth-code.js";

type IRequestDto = {
    token: string;
    password: string;
    confirmPassword: string;
}

/** Profissional dono do token de convite, se o link ainda valer. */
async function findInvitedProfessional(token: unknown) {
    const authCode = await findAuthToken("PROFESSIONAL_INVITE", token);
    if (!authCode?.userId) return null;

    const professional = await prisma.user.findUnique({
        where: { id: authCode.userId },
        select: { id: true, name: true, email: true, role: true, password: true, gym: { select: { name: true } } },
    });

    if (!professional || professional.role !== "PROFESSIONAL" || professional.password) return null;

    return { authCode, professional };
}

// Pagina "ativar conta" do app web: mostra para quem e o convite antes do
// formulario de senha.
export class GetProfessionalInviteService {
    async execute(dto: { token?: string }) {
        const invite = await findInvitedProfessional(dto.token);

        if (!invite) {
            throw new AppError(INVALID_LINK_MESSAGE, 400, "INVALID_INVITE");
        }

        return {
            name: invite.professional.name,
            email: invite.professional.email,
            gymName: invite.professional.gym?.name ?? null,
            expiresAt: invite.authCode.expiresAt,
        };
    }
}

// Primeiro acesso do profissional cadastrado pela academia: pelo link do
// convite ele cria a senha. Depois entra no app mobile com e-mail e senha.
export class ActivateProfessionalService {
    async execute(dto: IRequestDto) {
        if (!dto.password) {
            throw new AppError("Informe a senha.");
        }

        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const invite = await findInvitedProfessional(dto.token);

        if (!invite) {
            throw new AppError(INVALID_LINK_MESSAGE, 400, "INVALID_INVITE");
        }

        const hashedPassword = await hash(dto.password);

        // Uso unico: apaga o token e cria a senha juntos. Se duas requisicoes
        // usarem o mesmo link ao mesmo tempo, so uma consegue apagar.
        await prisma.$transaction(async (tx) => {
            const { count } = await tx.authCode.deleteMany({ where: { id: invite.authCode.id } });

            if (count === 0) {
                throw new AppError(INVALID_LINK_MESSAGE, 400, "INVALID_INVITE");
            }

            await tx.user.update({
                where: { id: invite.professional.id },
                data: { password: hashedPassword, emailVerified: true },
            });
        });

        return {
            email: invite.professional.email,
            message: "Conta ativada. Entre no app LSG FIT com seu e-mail e a senha que você criou.",
        };
    }
}
