import { verify } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { normalizeEmail } from "../utils/account-email.js";
import { serializeGym } from "../utils/serializers.js";

type IRequestDto = {
    email: string;
    password: string;
}

// Login da academia (app web). O controller cria a sessao por cookie.
export class AuthenticateGymService {
    async execute(dto: IRequestDto) {
        const gym = await prisma.gym.findUnique({ where: { email: normalizeEmail(dto.email) } });

        if (!gym) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        const isPasswordValid = await verify(gym.password, String(dto.password ?? ""));

        if (!isPasswordValid) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        return { gym: serializeGym(gym) };
    }
}
