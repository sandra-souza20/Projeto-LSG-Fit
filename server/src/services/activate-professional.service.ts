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

// Primeiro acesso do profissional cadastrado pela academia: com o codigo de
// convite ele cria a senha. O controller revoga as outras sessoes e cria uma nova.
export class ActivateProfessionalService {
    async execute(dto: IRequestDto) {
        if (!dto.password) {
            throw new AppError("Informe a senha.");
        }

        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const user = await prisma.user.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { id: true, role: true, password: true },
        });

        if (!user || user.role !== "PROFESSIONAL" || user.password) {
            throw new AppError(INVALID_CODE_MESSAGE);
        }

        await consumeAuthCode({ userId: user.id }, "PROFESSIONAL_INVITE", dto.code);

        const hashedPassword = await hash(dto.password);

        const activatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword, emailVerified: true },
            select: USER_SELECT,
        });

        return { user: serializeUser(activatedUser) };
    }
}
