import { prisma } from "../database/prisma.js";
import { sendProfessionalInviteEmail } from "./mailer.js";
import { AppError } from "../utils/app-error.js";
import { issueAuthCode } from "../utils/auth-code.js";

// Gera um codigo de convite novo (o anterior deixa de valer) e envia por e-mail.
export class SendProfessionalInviteService {
    async execute(professionalId: string) {
        const professional = await prisma.user.findUniqueOrThrow({
            where: { id: professionalId },
            select: { id: true, email: true, password: true, gym: { select: { name: true } } },
        });

        if (professional.password) {
            throw new AppError("Este profissional já ativou a conta.");
        }

        const code = await issueAuthCode({ userId: professional.id }, "PROFESSIONAL_INVITE");
        await sendProfessionalInviteEmail(professional.email, professional.gym?.name ?? "Sua academia", code);
    }
}
