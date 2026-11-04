import { Resend } from "resend";
import { AppError } from "../utils/app-error.js";
import { emailVerificationEnabled } from "../utils/email-verification.js";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "LSG FIT <onboarding@resend.dev>";

async function deliver(to: string, subject: string, html: string) {
    // The Resend SDK returns { data, error } instead of throwing on failure,
    // so a failed send has to be checked for explicitly here.
    const { error } = await resend!.emails.send({ from: EMAIL_FROM, to, subject, html });

    if (error) {
        throw new Error(error.message);
    }
}

function escapeHtml(text: string) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

type CodeEmail = {
    to: string;
    subject: string;
    heading: string;
    // Texto acima do codigo (ja em HTML seguro).
    intro: string;
    code: string;
    // Com EMAIL_VERIFICATION=off o remetente de teste do Resend so entrega para
    // o dono da conta. Para nao travar o fluxo, uma falha de envio vira log.
    tolerateFailure?: boolean;
};

async function sendCodeEmail({ to, subject, heading, intro, code, tolerateFailure }: CodeEmail) {
    if (!resend) {
        // No e-mail provider configured: print the code to the server console
        // so registration/login flows stay testable in local development.
        console.log(`[mailer] ${subject} -> ${to}: code ${code}`);
        return;
    }

    const html = `
        <div style="font-family: sans-serif; text-align: center;">
            <h2>${heading}</h2>
            <p>${intro}</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</p>
        </div>
    `;

    try {
        await deliver(to, subject, html);
    } catch (error) {
        console.error(`[mailer] Failed to send e-mail to ${to}:`, error);

        if (tolerateFailure) {
            console.log(`[mailer] ${subject} -> ${to}: code ${code}`);
            return;
        }

        throw new AppError("Não foi possível enviar o código para esse e-mail. Tente novamente mais tarde.", 502);
    }
}

export function sendVerificationCodeEmail(to: string, code: string) {
    return sendCodeEmail({
        to,
        subject: "Confirme seu cadastro na LSG FIT",
        heading: "Confirme seu e-mail",
        intro: "Use o código abaixo no app LSG FIT. Ele expira em 15 minutos.",
        code,
    });
}

export function sendPasswordResetCodeEmail(to: string, code: string) {
    return sendCodeEmail({
        to,
        subject: "Redefinição de senha - LSG FIT",
        heading: "Redefinir sua senha",
        intro: "Use o código abaixo no app LSG FIT. Ele expira em 15 minutos.",
        code,
    });
}

export function sendGymPasswordResetCodeEmail(to: string, code: string) {
    return sendCodeEmail({
        to,
        subject: "Redefinição de senha - LSG FIT Academia",
        heading: "Redefinir a senha da academia",
        intro: "Use o código abaixo no painel da academia LSG FIT. Ele expira em 15 minutos.",
        code,
    });
}

// Convite do profissional cadastrado pela academia: ele usa o codigo no app
// (primeiro acesso) para criar a senha e ativar a conta.
export function sendProfessionalInviteEmail(to: string, gymName: string, code: string) {
    return sendCodeEmail({
        to,
        subject: `${gymName} convidou você para a LSG FIT`,
        heading: "Ative sua conta de profissional",
        intro:
            `A academia <strong>${escapeHtml(gymName)}</strong> cadastrou você como profissional na LSG FIT. ` +
            "No app, escolha \"Primeiro acesso\" e use o código abaixo para criar a sua senha. Ele expira em 72 horas.",
        code,
        tolerateFailure: !emailVerificationEnabled,
    });
}
