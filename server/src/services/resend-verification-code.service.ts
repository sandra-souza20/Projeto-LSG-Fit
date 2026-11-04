import { prisma } from "../database/prisma.js";
import { sendVerificationCodeEmail } from "./mailer.js";
import { normalizeEmail } from "../utils/account-email.js";
import { issueAuthCode } from "../utils/auth-code.js";

type IRequestDto = {
    email: string;
}

const GENERIC_MESSAGE = "Se houver um cadastro pendente com esse e-mail, um novo código foi enviado.";

export class ResendVerificationCodeService {
    async execute(dto: IRequestDto) {
        const user = await prisma.user.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { id: true, email: true, role: true, emailVerified: true },
        });

        // Sempre a mesma resposta, para nao revelar quais e-mails tem cadastro.
        if (!user || user.role !== "STUDENT" || user.emailVerified) {
            return { message: GENERIC_MESSAGE };
        }

        const code = await issueAuthCode({ userId: user.id }, "EMAIL_VERIFICATION");
        await sendVerificationCodeEmail(user.email, code);

        return { message: GENERIC_MESSAGE };
    }
}
