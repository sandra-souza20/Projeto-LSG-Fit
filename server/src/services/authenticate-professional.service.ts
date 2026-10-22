import { verify } from "argon2";
import { prisma } from "../database/prisma.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    email: string;
    password: string;
}

export class AuthenticateProfessionalService {
    async execute(dto: IRequestDto) {
        const professional = await prisma.professional.findUnique({ where: { email: dto.email } });

        if (!professional) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        const isPasswordValid = await verify(professional.password, dto.password);

        if (!isPasswordValid) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        const token = signToken(professional.id, "PROFESSIONAL");

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
            token,
        };
    }
}
