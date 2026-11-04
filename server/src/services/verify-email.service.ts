import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { normalizeEmail } from "../utils/account-email.js";
import { consumeAuthCode, INVALID_CODE_MESSAGE } from "../utils/auth-code.js";
import { serializeUser, USER_SELECT } from "../utils/serializers.js";

type IRequestDto = {
    email: string;
    code: string;
}

export class VerifyEmailService {
    async execute(dto: IRequestDto) {
        const user = await prisma.user.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { id: true, role: true, emailVerified: true },
        });

        // Mesma resposta para e-mail inexistente ou ja confirmado, para nao
        // revelar quais e-mails tem cadastro.
        if (!user || user.role !== "STUDENT" || user.emailVerified) {
            throw new AppError(INVALID_CODE_MESSAGE);
        }

        await consumeAuthCode({ userId: user.id }, "EMAIL_VERIFICATION", dto.code);

        const verifiedUser = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
            select: USER_SELECT,
        });

        return { user: serializeUser(verifiedUser) };
    }
}
