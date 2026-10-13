import { prisma } from "../database/prisma.js";
import { sendVerificationCodeEmail } from "./mailer.js";
import { AppError } from "../utils/app-error.js";
import { generateVerificationCode, getVerificationCodeExpiration } from "../utils/verification-code.js";

type IRequestDto = {
    email: string;
}

export class ResendVerificationCodeService {
    async execute(dto: IRequestDto) {
        const user = await prisma.user.findUnique({ where: { email: dto.email } });

        if (!user) {
            throw new AppError("Não encontramos um cadastro com esse e-mail.", 401);
        }

        if (user.emailVerified) {
            throw new AppError("E-mail já verificado.");
        }

        const verificationCode = generateVerificationCode();

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode,
                verificationCodeExpiresAt: getVerificationCodeExpiration(),
            },
        });

        await sendVerificationCodeEmail(user.email, verificationCode);

        return { message: "Código reenviado." };
    }
}
