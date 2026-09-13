import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export class CreateGymService {
    async execute(dto: IRequestDto) {
        if (dto.password !== dto.confirmPassword) {
            throw new AppError("Passwords do not match");
        }

        const emailInUse = await prisma.gym.findUnique({ where: { email: dto.email } });

        if (emailInUse) {
            throw new AppError("Email already in use");
        }

        const hashedPassword = await hash(dto.password);

        const gym = await prisma.gym.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
            },
        });

        return {
            gym: {
                id: gym.id,
                name: gym.name,
                email: gym.email,
                createdAt: gym.createdAt,
                updatedAt: gym.updatedAt,
            },
        };
    }
}
