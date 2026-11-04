import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { ensureEmailAvailable, isValidEmail, normalizeEmail } from "../utils/account-email.js";
import { serializeGym } from "../utils/serializers.js";

type IRequestDto = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone?: string | null;
    address?: string | null;
}

// Cadastro livre da academia (app web). O controller cria a sessao.
export class CreateGymService {
    async execute(dto: IRequestDto) {
        const name = dto.name?.trim();
        const email = normalizeEmail(dto.email);

        if (!name) {
            throw new AppError("Informe o nome da academia.");
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

        await ensureEmailAvailable(email);

        const hashedPassword = await hash(dto.password);

        const gym = await prisma.gym.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone: dto.phone?.trim() || null,
                address: dto.address?.trim() || null,
            },
        });

        return { gym: serializeGym(gym) };
    }
}
