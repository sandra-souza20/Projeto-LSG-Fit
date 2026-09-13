import { verify } from "argon2";
import { prisma } from "../database/prisma.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    email: string;
    password: string;
}

export class AuthenticateUserService {
    async execute(dto: IRequestDto) {
        const user = await prisma.user.findUnique({ where: { email: dto.email } });

        if (!user) {
            throw new AppError("Invalid credentials", 401);
        }

        const isPasswordValid = await verify(user.password, dto.password);

        if (!isPasswordValid) {
            throw new AppError("Invalid credentials", 401);
        }

        if (!user.emailVerified) {
            throw new AppError("Confirme seu e-mail antes de entrar.", 403, "EMAIL_NOT_VERIFIED");
        }

        const token = signToken(user.id, "STUDENT");

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            token,
        };
    }
}
