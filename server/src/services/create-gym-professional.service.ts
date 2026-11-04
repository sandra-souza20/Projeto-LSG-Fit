import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { ensureEmailAvailable, isValidEmail, normalizeEmail } from "../utils/account-email.js";
import { SendProfessionalInviteService } from "./send-professional-invite.service.js";

type IRequestDto = {
    gymId: string;
    name: string;
    email: string;
    phone?: string | null;
    specialty?: string | null;
}

export const GYM_PROFESSIONAL_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    specialty: true,
    password: true,
    createdAt: true,
    _count: { select: { students: true } },
} as const;

// Formato GymProfessional (docs/contrato-api.md, secao 5). A senha so e lida
// para saber se o profissional ja ativou a conta; nunca sai na resposta.
export function serializeGymProfessional(professional: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    specialty: string | null;
    password: string | null;
    createdAt: Date;
    _count: { students: number };
}) {
    return {
        id: professional.id,
        name: professional.name,
        email: professional.email,
        phone: professional.phone,
        specialty: professional.specialty,
        activated: professional.password !== null,
        studentsCount: professional._count.students,
        createdAt: professional.createdAt,
    };
}

// Relacao "Contrata" do DER: so a academia cadastra profissionais. A conta
// nasce sem senha e o profissional recebe um codigo de convite (72 h) para
// ativa-la no app.
export class CreateGymProfessionalService {
    async execute(dto: IRequestDto) {
        const name = dto.name?.trim();
        const email = normalizeEmail(dto.email);

        if (!name) {
            throw new AppError("Informe o nome do profissional.");
        }

        if (!isValidEmail(email)) {
            throw new AppError("Informe um e-mail válido.");
        }

        await ensureEmailAvailable(email);

        const professional = await prisma.user.create({
            data: {
                name,
                email,
                role: "PROFESSIONAL",
                password: null,
                gymId: dto.gymId,
                phone: dto.phone?.trim() || null,
                specialty: dto.specialty?.trim() || null,
            },
            select: GYM_PROFESSIONAL_SELECT,
        });

        try {
            await new SendProfessionalInviteService().execute(professional.id);
        } catch (error) {
            // Sem o convite o profissional nao consegue entrar: desfaz o cadastro
            // para a academia poder tentar de novo com o mesmo e-mail.
            await prisma.user.deleteMany({ where: { id: professional.id } });
            throw error;
        }

        return serializeGymProfessional(professional);
    }
}
