import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { normalizeEmail } from "../utils/account-email.js";
import { consumeAuthCode, INVALID_CODE_MESSAGE } from "../utils/auth-code.js";
import { serializeUser, USER_SELECT } from "../utils/serializers.js";

type IRequestDto = {
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
}

// O controller revoga as outras sessoes da conta e cria uma nova.
export class ResetPasswordService {
    async execute(dto: IRequestDto) {
        if (!dto.password) {
            throw new AppError("Informe a nova senha.");
        }

        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const user = await prisma.user.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { id: true, password: true },
        });

        // Profissional sem senha ativa a conta por /users/activate.
        if (!user || !user.password) {
            throw new AppError(INVALID_CODE_MESSAGE);
        }

        await consumeAuthCode({ userId: user.id }, "PASSWORD_RESET", dto.code);

        const hashedPassword = await hash(dto.password);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            // O codigo chegou pelo e-mail, entao ele tambem fica confirmado.
            data: { password: hashedPassword, emailVerified: true },
            select: USER_SELECT,
        });

        return { user: serializeUser(updatedUser) };
    }
}
