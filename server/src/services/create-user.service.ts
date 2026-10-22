import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { sendVerificationCodeEmail } from "./mailer.js";
import { AppError } from "../utils/app-error.js";
import { emailVerificationEnabled } from "../utils/email-verification.js";
import { signToken } from "../utils/jwt.js";
import { generateVerificationCode, getVerificationCodeExpiration } from "../utils/verification-code.js";

type IRequestDto = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    // Matricula opcional ja no cadastro (relacao "Matricula" do DER).
    gymId?: string | null;
}

export class CreateUserService {
    async execute(dto: IRequestDto) {
        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const emailInUse = await prisma.user.findUnique({ where: { email: dto.email } });

        // Um cadastro que nunca foi confirmado nao prende o e-mail: quem tentar
        // de novo sobrescreve os dados pendentes e recebe um codigo novo.
        if (emailInUse?.emailVerified) {
            throw new AppError("Este e-mail já está em uso.");
        }

        const gymId = dto.gymId || null;

        if (gymId) {
            const gym = await prisma.gym.findUnique({ where: { id: gymId } });

            if (!gym) {
                throw new AppError("Academia não encontrada.", 404);
            }
        }

        const enrollment = { gymId, gymEnrolledAt: gymId ? new Date() : null };

        const hashedPassword = await hash(dto.password);

        if (!emailVerificationEnabled) {
            const data = { name: dto.name, password: hashedPassword, emailVerified: true, ...enrollment };

            const user = await prisma.user.upsert({
                where: { email: dto.email },
                create: { ...data, email: dto.email },
                update: data,
            });

            return {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
                token: signToken(user.id, "STUDENT"),
                message: "Cadastro criado.",
            };
        }

        const verificationCode = generateVerificationCode();

        const data = {
            name: dto.name,
            password: hashedPassword,
            verificationCode,
            verificationCodeExpiresAt: getVerificationCodeExpiration(),
            ...enrollment,
        };

        const user = await prisma.user.upsert({
            where: { email: dto.email },
            create: { ...data, email: dto.email },
            update: data,
        });

        await sendVerificationCodeEmail(user.email, verificationCode);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            message: "Cadastro criado. Verifique o código enviado para o seu e-mail.",
        };
    }
}
