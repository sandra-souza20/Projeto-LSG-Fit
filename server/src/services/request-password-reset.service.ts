import { prisma } from "../database/prisma.js";
import { sendPasswordResetCodeEmail } from "./mailer.js";
import { SendProfessionalInviteService } from "./send-professional-invite.service.js";
import { normalizeEmail } from "../utils/account-email.js";
import { issueAuthCode } from "../utils/auth-code.js";

type IRequestDto = {
    email: string;
}

const GENERIC_MESSAGE = "Se o e-mail existir, um código de redefinição foi enviado.";

export class RequestPasswordResetService {
    async execute(dto: IRequestDto) {
        const user = await prisma.user.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { id: true, email: true, password: true },
        });

        // Always return the same message, whether the e-mail exists or not,
        // so this endpoint can't be used to check which e-mails are registered.
        if (!user) {
            return { message: GENERIC_MESSAGE };
        }

        // Profissional que ainda nao ativou a conta nao tem senha para
        // redefinir: recebe um novo codigo de convite.
        if (!user.password) {
            await new SendProfessionalInviteService().execute(user.id);

            return { message: GENERIC_MESSAGE };
        }

        const code = await issueAuthCode({ userId: user.id }, "PASSWORD_RESET");
        await sendPasswordResetCodeEmail(user.email, code);

        return { message: GENERIC_MESSAGE };
    }
}
