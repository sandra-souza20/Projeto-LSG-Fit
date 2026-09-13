import { prisma } from "../database/prisma.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    email: string;
    code: string;
}

export class VerifyEmailService {
    async execute(dto: IRequestDto) {
        const user = await prisma.user.findUnique({ where: { email: dto.email } });

        if (!user) {
            throw new AppError("Invalid credentials", 401);
        }

        if (user.emailVerified) {
            throw new AppError("E-mail já verificado.");
        }

        const isCodeValid = user.verificationCode === dto.code;
        const isCodeExpired = !user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date();

        if (!isCodeValid || isCodeExpired) {
            throw new AppError("Código inválido ou expirado.");
        }

        const verifiedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationCode: null,
                verificationCodeExpiresAt: null,
            },
        });

        const token = signToken(verifiedUser.id, "STUDENT");

        return {
            user: {
                id: verifiedUser.id,
                name: verifiedUser.name,
                email: verifiedUser.email,
                createdAt: verifiedUser.createdAt,
                updatedAt: verifiedUser.updatedAt,
            },
            token,
        };
    }
}
