import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    gymId?: string | null;
    phone?: string | null;
    specialty?: string | null;
}

export class CreateProfessionalService {
    async execute(dto: IRequestDto) {
        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const emailInUse = await prisma.professional.findUnique({ where: { email: dto.email } });

        if (emailInUse) {
            throw new AppError("Este e-mail já está em uso.");
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
                gymId: dto.gymId || null,
                // Relacao "Contrata": a academia precisa aprovar o vinculo.
                gymStatus: dto.gymId ? "PENDING" : null,
                phone: dto.phone?.trim() || null,
                specialty: dto.specialty?.trim() || null,
            },
        });

        return {
            professional: {
                id: professional.id,
                name: professional.name,
                email: professional.email,
                phone: professional.phone,
                specialty: professional.specialty,
                bio: professional.bio,
                gymId: professional.gymId,
                gymStatus: professional.gymStatus,
                createdAt: professional.createdAt,
                updatedAt: professional.updatedAt,
            },
        };
    }
}
