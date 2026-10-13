import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
}

export class ResetPasswordService {
    async execute(dto: IRequestDto) {
        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const user = await prisma.user.findUnique({ where: { email: dto.email } });

        if (!user) {
            throw new AppError("Código inválido ou expirado.");
        }

        const isCodeValid = user.resetPasswordCode === dto.code;
        const isCodeExpired = !user.resetPasswordCodeExpiresAt || user.resetPasswordCodeExpiresAt < new Date();

        if (!isCodeValid || isCodeExpired) {
            throw new AppError("Código inválido ou expirado.");
        }

        const hashedPassword = await hash(dto.password);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordCode: null,
                resetPasswordCodeExpiresAt: null,
            },
        });

        const token = signToken(updatedUser.id, "STUDENT");

        return {
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
            },
            token,
        };
    }
}
