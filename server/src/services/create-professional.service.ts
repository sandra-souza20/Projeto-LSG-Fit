import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    gymId?: string;
}

export class CreateProfessionalService {
    async execute(dto: IRequestDto) {
        if (dto.password !== dto.confirmPassword) {
            throw new AppError("Passwords do not match");
        }

        const emailInUse = await prisma.professional.findUnique({ where: { email: dto.email } });

        if (emailInUse) {
            throw new AppError("Email already in use");
        }

        if (dto.gymId) {
            const gym = await prisma.gym.findUnique({ where: { id: dto.gymId } });

            if (!gym) {
                throw new AppError("Academia não encontrada.", 404);
            }
        }

        const hashedPassword = await hash(dto.password);

        const professional = await prisma.professional.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
                gymId: dto.gymId ?? null,
            },
        });

        return {
            professional: {
                id: professional.id,
                name: professional.name,
                email: professional.email,
                gymId: professional.gymId,
                createdAt: professional.createdAt,
                updatedAt: professional.updatedAt,
            },
        };
    }
}
