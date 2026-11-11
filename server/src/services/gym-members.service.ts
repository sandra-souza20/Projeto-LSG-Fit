import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { SendGymMemberInviteService } from "./send-gym-member-invite.service.js";
import { AppError } from "../utils/app-error.js";
import { ensureEmailAvailable, isValidEmail, normalizeEmail } from "../utils/account-email.js";
import { findAuthToken } from "../utils/auth-code.js";
import { GYM_ADDRESS_SELECT } from "../utils/gym-address.js";
import { GYM_MEMBER_SELECT, serializeGym, serializeGymMember } from "../utils/serializers.js";

const INVALID_GYM_INVITE_MESSAGE = "Link inválido ou expirado. Peça um novo convite ao dono da academia.";

// O dono convida um administrador so com nome e e-mail. A conta nasce sem
// senha e a pessoa recebe um link (72 h) para cria-la.
export class InviteGymMemberService {
    async execute(dto: { gymId: string; name?: string; email?: string }) {
        const name = dto.name?.trim();
        const email = normalizeEmail(dto.email);

        if (!name) {
            throw new AppError("Informe o nome.");
        }

        if (!isValidEmail(email)) {
            throw new AppError("Informe um e-mail válido.");
        }

        await ensureEmailAvailable(email);

        const member = await prisma.gymMember.create({
            data: { gymId: dto.gymId, name, email, password: null, role: "ADMIN" },
            select: GYM_MEMBER_SELECT,
        });

        try {
            await new SendGymMemberInviteService().execute(member.id);
        } catch (error) {
            // Sem o convite a pessoa nao consegue entrar: desfaz o cadastro para
            // o dono poder tentar de novo com o mesmo e-mail.
            await prisma.gymMember.deleteMany({ where: { id: member.id } });
            throw error;
        }

        return serializeGymMember(member);
    }
}

/** Membro dono do token de convite, se o link ainda valer. */
async function findInvitedMember(token: unknown) {
    const authCode = await findAuthToken("GYM_MEMBER_INVITE", token);
    if (!authCode?.gymMemberId) return null;

    const member = await prisma.gymMember.findUnique({
        where: { id: authCode.gymMemberId },
        select: { id: true, name: true, email: true, password: true, gym: { select: { name: true } } },
    });

    if (!member || member.password) return null;

    return { authCode, member };
}

// Pagina "aceitar convite" do app web: mostra para quem e o convite.
export class GetGymMemberInviteService {
    async execute(dto: { token?: string }) {
        const invite = await findInvitedMember(dto.token);

        if (!invite) {
            throw new AppError(INVALID_GYM_INVITE_MESSAGE, 400, "INVALID_INVITE");
        }

        return {
            name: invite.member.name,
            email: invite.member.email,
            gymName: invite.member.gym.name,
            expiresAt: invite.authCode.expiresAt,
        };
    }
}

// Cria a senha pelo link do convite. O controller ja abre a sessao (cookie).
export class ActivateGymMemberService {
    async execute(dto: { token?: string; password?: string; confirmPassword?: string }) {
        if (!dto.password) {
            throw new AppError("Informe a senha.");
        }

        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const invite = await findInvitedMember(dto.token);

        if (!invite) {
            throw new AppError(INVALID_GYM_INVITE_MESSAGE, 400, "INVALID_INVITE");
        }

        const hashedPassword = await hash(dto.password);

        // Uso unico: apaga o token e cria a senha juntos.
        const member = await prisma.$transaction(async (tx) => {
            const { count } = await tx.authCode.deleteMany({ where: { id: invite.authCode.id } });

            if (count === 0) {
                throw new AppError(INVALID_GYM_INVITE_MESSAGE, 400, "INVALID_INVITE");
            }

            return tx.gymMember.update({
                where: { id: invite.member.id },
                data: { password: hashedPassword },
                select: {
                    ...GYM_MEMBER_SELECT,
                    gym: { select: { id: true, name: true, phone: true, equipment: true, createdAt: true, updatedAt: true, ...GYM_ADDRESS_SELECT } },
                },
            });
        });

        return { member: serializeGymMember(member), gym: serializeGym(member.gym), session: { id: member.id, gymId: member.gymId } };
    }
}
