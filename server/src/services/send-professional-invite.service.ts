import { prisma } from "../database/prisma.js";
import { sendProfessionalInviteEmail } from "./mailer.js";
import { WEB_ORIGIN } from "../middlewares/check-web-origin.js";
import { AppError } from "../utils/app-error.js";
import { issueAuthToken } from "../utils/auth-code.js";

// Pagina publica do app web onde o profissional cria a senha.
export const ACTIVATION_PATH = "/ativar-conta";

export function activationLink(token: string): string {
    if (!WEB_ORIGIN) {
        throw new AppError("WEB_ORIGIN não definida: não é possível montar o link do convite.", 500);
    }

    return `${WEB_ORIGIN}${ACTIVATION_PATH}?token=${encodeURIComponent(token)}`;
}

// Gera um link de convite novo (o anterior deixa de valer) e envia por e-mail.
export class SendProfessionalInviteService {
    async execute(professionalId: string) {
        const professional = await prisma.user.findUniqueOrThrow({
            where: { id: professionalId },
            select: { id: true, email: true, password: true, gym: { select: { name: true } } },
        });

        if (professional.password) {
            throw new AppError("Este profissional já ativou a conta.");
        }

        const token = await issueAuthToken({ userId: professional.id }, "PROFESSIONAL_INVITE");
        await sendProfessionalInviteEmail(
            professional.email,
            professional.gym?.name ?? "Sua academia",
            activationLink(token),
        );
    }
}
