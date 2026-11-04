import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { normalizeEmail } from "../utils/account-email.js";
import { consumeAuthCode, INVALID_CODE_MESSAGE } from "../utils/auth-code.js";
import { serializeGym } from "../utils/serializers.js";

type IRequestDto = {
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
}

// O controller revoga as outras sessoes da academia e cria uma nova.
export class ResetGymPasswordService {
    async execute(dto: IRequestDto) {
        if (!dto.password) {
            throw new AppError("Informe a nova senha.");
        }

        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const gym = await prisma.gym.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { id: true },
        });

        if (!gym) {
            throw new AppError(INVALID_CODE_MESSAGE);
        }

        await consumeAuthCode({ gymId: gym.id }, "PASSWORD_RESET", dto.code);

        const updatedGym = await prisma.gym.update({
            where: { id: gym.id },
            data: { password: await hash(dto.password) },
        });

        return { gym: serializeGym(updatedGym) };
    }
}
