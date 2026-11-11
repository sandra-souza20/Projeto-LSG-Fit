import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { sendVerificationCodeEmail } from "./mailer.js";
import { AppError } from "../utils/app-error.js";
import { emailVerificationEnabled } from "../utils/email-verification.js";
import { ensureEmailAvailable, isValidEmail, normalizeEmail } from "../utils/account-email.js";
import { issueAuthCode } from "../utils/auth-code.js";
import { serializeUser, USER_SELECT } from "../utils/serializers.js";

type IRequestDto = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

// Cadastro livre, so de aluno. Profissionais sao cadastrados pela academia.
export class CreateUserService {
    async execute(dto: IRequestDto) {
        const name = dto.name?.trim();
        const email = normalizeEmail(dto.email);

        if (!name) {
            throw new AppError("Informe o seu nome.");
        }

        if (!isValidEmail(email)) {
            throw new AppError("Informe um e-mail válido.");
        }

        if (!dto.password) {
            throw new AppError("Informe a senha.");
        }

        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        // Um cadastro de aluno que nunca foi confirmado nao prende o e-mail:
        // quem tentar de novo sobrescreve os dados pendentes e recebe um codigo novo.
        const existing = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, emailVerified: true },
        });
        const pendingStudent = existing?.role === "STUDENT" && !existing.emailVerified ? existing : null;

        await ensureEmailAvailable(email, pendingStudent ? { ignoreUserId: pendingStudent.id } : {});

        const hashedPassword = await hash(dto.password);

        const data = {
            name,
            password: hashedPassword,
            role: "STUDENT" as const,
            emailVerified: !emailVerificationEnabled,
        };

        const user = await prisma.user.upsert({
            where: { email },
            create: { ...data, email },
            update: data,
            select: USER_SELECT,
        });

        if (!emailVerificationEnabled) {
            // O controller cria a sessao: a conta ja nasce confirmada.
            return { user: serializeUser(user), message: "Cadastro criado.", startSession: true };
        }

        const code = await issueAuthCode({ userId: user.id }, "EMAIL_VERIFICATION");
        await sendVerificationCodeEmail(user.email, code);

        return {
            user: serializeUser(user),
            message: "Cadastro criado. Verifique o código enviado para o seu e-mail.",
            startSession: false,
        };
    }
}
