import { verify } from "argon2";
import { prisma } from "../database/prisma.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    email: string;
    password: string;
}

export class AuthenticateGymService {
    async execute(dto: IRequestDto) {
        const gym = await prisma.gym.findUnique({ where: { email: dto.email } });

        if (!gym) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        const isPasswordValid = await verify(gym.password, dto.password);

        if (!isPasswordValid) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        const token = signToken(gym.id, "GYM");

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
            token,
        };
    }
}
