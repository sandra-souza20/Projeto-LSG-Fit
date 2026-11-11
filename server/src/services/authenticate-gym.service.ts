import { verify } from "argon2";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { normalizeEmail } from "../utils/account-email.js";
import { GYM_ADDRESS_SELECT } from "../utils/gym-address.js";
import { GYM_MEMBER_SELECT, serializeGym, serializeGymMember } from "../utils/serializers.js";

type IRequestDto = {
    email: string;
    password: string;
}

// Login de um membro da academia (app web). O controller cria a sessao por cookie.
export class AuthenticateGymService {
    async execute(dto: IRequestDto) {
        const member = await prisma.gymMember.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: {
                ...GYM_MEMBER_SELECT,
                gym: { select: { id: true, name: true, phone: true, equipment: true, createdAt: true, updatedAt: true, ...GYM_ADDRESS_SELECT } },
            },
        });

        if (!member) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        // Convidado que ainda nao criou a senha.
        if (!member.password) {
            throw new AppError(
                "Conta ainda não ativada. Abra o link do convite enviado para o seu e-mail para criar a senha.",
                403,
                "ACCOUNT_NOT_ACTIVATED",
            );
        }

        const isPasswordValid = await verify(member.password, String(dto.password ?? ""));

        if (!isPasswordValid) {
            throw new AppError("E-mail ou senha inválidos.", 401);
        }

        return { member: serializeGymMember(member), gym: serializeGym(member.gym), session: { id: member.id, gymId: member.gymId } };
    }
}
