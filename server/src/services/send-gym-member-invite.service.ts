import { prisma } from "../database/prisma.js";
import { sendGymMemberInviteEmail } from "./mailer.js";
import { WEB_ORIGIN } from "../middlewares/check-web-origin.js";
import { AppError } from "../utils/app-error.js";
import { issueAuthToken } from "../utils/auth-code.js";

// Pagina publica do app web onde o membro convidado cria a senha.
export const GYM_INVITE_PATH = "/aceitar-convite";

export function gymInviteLink(token: string): string {
    if (!WEB_ORIGIN) {
        throw new AppError("WEB_ORIGIN não definida: não é possível montar o link do convite.", 500);
    }

    return `${WEB_ORIGIN}${GYM_INVITE_PATH}?token=${encodeURIComponent(token)}`;
}

// Gera um link de convite novo (o anterior deixa de valer) e envia por e-mail.
export class SendGymMemberInviteService {
    async execute(memberId: string) {
        const member = await prisma.gymMember.findUniqueOrThrow({
            where: { id: memberId },
            select: {
                id: true,
                email: true,
                password: true,
                gym: {
                    select: {
                        name: true,
                        members: { where: { role: "OWNER" }, select: { name: true }, take: 1 },
                    },
                },
            },
        });

        if (member.password) {
            throw new AppError("Este membro já ativou a conta.");
        }

        const token = await issueAuthToken({ gymMemberId: member.id }, "GYM_MEMBER_INVITE");
        await sendGymMemberInviteEmail(
            member.email,
            member.gym.name,
            member.gym.members[0]?.name ?? member.gym.name,
            gymInviteLink(token),
        );
    }
}
