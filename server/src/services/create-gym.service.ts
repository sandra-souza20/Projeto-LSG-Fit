import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone?: string | null;
    address?: string | null;
}

export class CreateGymService {
    async execute(dto: IRequestDto) {
        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const emailInUse = await prisma.gym.findUnique({ where: { email: dto.email } });

        if (emailInUse) {
            throw new AppError("Este e-mail já está em uso.");
        }

        const hashedPassword = await hash(dto.password);

        const gym = await prisma.gym.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
                phone: dto.phone?.trim() || null,
                address: dto.address?.trim() || null,
            },
        });

        return {
            gym: {
                id: gym.id,
                name: gym.name,
                email: gym.email,
                phone: gym.phone,
                address: gym.address,
                createdAt: gym.createdAt,
                updatedAt: gym.updatedAt,
            },
        };
    }
}
