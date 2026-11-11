import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { ensureEmailAvailable, isValidEmail, normalizeEmail } from "../utils/account-email.js";
import { addressToColumns, GYM_ADDRESS_SELECT } from "../utils/gym-address.js";
import { GYM_MEMBER_SELECT, serializeGym, serializeGymMember } from "../utils/serializers.js";

type IRequestDto = {
    // Quem esta cadastrando (vira o dono, OWNER).
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    gym?: {
        name?: string;
        phone?: string | null;
        address?: unknown;
    };
}

// Cadastro livre da academia (app web): cria a academia e o primeiro membro,
// o dono. O controller cria a sessao.
export class CreateGymService {
    async execute(dto: IRequestDto) {
        const name = dto.name?.trim();
        const email = normalizeEmail(dto.email);
        const gymName = dto.gym?.name?.trim();

        if (!gymName) {
            throw new AppError("Informe o nome da academia.");
        }

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

        const address = addressToColumns(dto.gym?.address ?? undefined);

        await ensureEmailAvailable(email);

        const hashedPassword = await hash(dto.password);

        const member = await prisma.gymMember.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "OWNER",
                gym: {
                    create: {
                        name: gymName,
                        phone: dto.gym?.phone?.trim() || null,
                        ...address,
                    },
                },
            },
            select: {
                ...GYM_MEMBER_SELECT,
                gym: { select: { id: true, name: true, phone: true, equipment: true, createdAt: true, updatedAt: true, ...GYM_ADDRESS_SELECT } },
            },
        });

        return { member: serializeGymMember(member), gym: serializeGym(member.gym), session: { id: member.id, gymId: member.gymId } };
    }
}
