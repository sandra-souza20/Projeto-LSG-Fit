import { prisma } from "../database/prisma.js";
import { sendGymPasswordResetCodeEmail } from "./mailer.js";
import { SendGymMemberInviteService } from "./send-gym-member-invite.service.js";
import { normalizeEmail } from "../utils/account-email.js";
import { issueAuthCode } from "../utils/auth-code.js";

type IRequestDto = {
    email: string;
}

const GENERIC_MESSAGE = "Se o e-mail existir, um código de redefinição foi enviado.";

// Recuperacao de senha de um membro da academia (app web), com codigo PASSWORD_RESET.
export class RequestGymPasswordResetService {
    async execute(dto: IRequestDto) {
        const member = await prisma.gymMember.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { id: true, email: true, password: true },
        });

        // Sempre a mesma resposta, para nao revelar quais e-mails tem cadastro.
        if (!member) {
            return { message: GENERIC_MESSAGE };
        }

        // Convidado que ainda nao criou a senha: recebe um novo link de convite.
        if (!member.password) {
            await new SendGymMemberInviteService().execute(member.id);

            return { message: GENERIC_MESSAGE };
        }

        const code = await issueAuthCode({ gymMemberId: member.id }, "PASSWORD_RESET");
        await sendGymPasswordResetCodeEmail(member.email, code);

        return { message: GENERIC_MESSAGE };
    }
}
