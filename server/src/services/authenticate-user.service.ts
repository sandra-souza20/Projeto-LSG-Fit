import { verify } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { emailVerificationEnabled } from "../utils/email-verification.js";
import { normalizeEmail } from "../utils/account-email.js";
import { serializeUser, USER_SELECT } from "../utils/serializers.js";

type IRequestDto = {
    email: string;
    password: string;
}

// Login unico do app mobile: aluno ou profissional. O papel vem do cadastro.
export class AuthenticateUserService {
    async execute(dto: IRequestDto) {
        const user = await prisma.user.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { ...USER_SELECT, password: true, emailVerified: true },
        });

        if (!user) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        // Profissional cadastrado pela academia ainda nao criou a senha.
        if (!user.password) {
            throw new AppError(
                "Conta ainda não ativada. Abra o link do convite enviado para o seu e-mail para criar a senha.",
                403,
                "ACCOUNT_NOT_ACTIVATED",
            );
        }

        const isPasswordValid = await verify(user.password, String(dto.password ?? ""));

        if (!isPasswordValid) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        if (user.role === "STUDENT" && emailVerificationEnabled && !user.emailVerified) {
            throw new AppError("Confirme seu e-mail antes de entrar.", 403, "EMAIL_NOT_VERIFIED");
        }

        return { user: serializeUser(user) };
    }
}
