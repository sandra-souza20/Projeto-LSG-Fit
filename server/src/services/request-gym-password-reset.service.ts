import { prisma } from "../database/prisma.js";
import { sendGymPasswordResetCodeEmail } from "./mailer.js";
import { normalizeEmail } from "../utils/account-email.js";
import { issueAuthCode } from "../utils/auth-code.js";

type IRequestDto = {
    email: string;
}

const GENERIC_MESSAGE = "Se o e-mail existir, um código de redefinição foi enviado.";

// Recuperacao de senha da academia (app web), com codigo PASSWORD_RESET.
export class RequestGymPasswordResetService {
    async execute(dto: IRequestDto) {
        const gym = await prisma.gym.findUnique({
            where: { email: normalizeEmail(dto.email) },
            select: { id: true, email: true },
        });

        // Sempre a mesma resposta, para nao revelar quais e-mails tem cadastro.
        if (!gym) {
            return { message: GENERIC_MESSAGE };
        }

        const code = await issueAuthCode({ gymId: gym.id }, "PASSWORD_RESET");
        await sendGymPasswordResetCodeEmail(gym.email, code);

        return { message: GENERIC_MESSAGE };
    }
}
