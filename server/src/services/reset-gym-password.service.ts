import { hash } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { normalizeEmail } from "../utils/account-email.js";
import { consumeAuthCode, INVALID_CODE_MESSAGE } from "../utils/auth-code.js";
import { GYM_ADDRESS_SELECT } from "../utils/gym-address.js";
import { GYM_MEMBER_SELECT, serializeGym, serializeGymMember } from "../utils/serializers.js";

type IRequestDto = {
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
}

// O controller revoga as outras sessoes do membro e cria uma nova.
export class ResetGymPasswordService {
    async execute(dto: IRequestDto) {
        if (!dto.password) {
            throw new AppError("Informe a nova senha.");
        }

        if (dto.password !== dto.confirmPassword) {
            throw new AppError("As senhas não coincidem.");
        }

        const member = await prisma.gymMember.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { id: true, password: true },
        });

        // Convidado sem senha usa o link do convite, nao a redefinicao.
        if (!member?.password) {
            throw new AppError(INVALID_CODE_MESSAGE);
        }

        await consumeAuthCode({ gymMemberId: member.id }, "PASSWORD_RESET", dto.code);

        const updated = await prisma.gymMember.update({
            where: { id: member.id },
            data: { password: await hash(dto.password) },
            select: {
                ...GYM_MEMBER_SELECT,
                gym: { select: { id: true, name: true, phone: true, equipment: true, createdAt: true, updatedAt: true, ...GYM_ADDRESS_SELECT } },
            },
        });

        return { member: serializeGymMember(updated), gym: serializeGym(updated.gym), session: { id: updated.id, gymId: updated.gymId } };
    }
}
