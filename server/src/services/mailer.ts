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

type InviteEmail = {
    to: string;
    subject: string;
    heading: string;
    // Texto acima do botao (ja em HTML seguro).
    intro: string;
    buttonLabel: string;
    link: string;
};

// E-mail com um botao para o link do convite (72 h).
async function sendInviteLinkEmail({ to, subject, heading, intro, buttonLabel, link }: InviteEmail) {
    if (!resend) {
        console.log(`[mailer] ${subject} -> ${to}: link ${link}`);
        return;
    }

    const safeLink = escapeHtml(link);
    const html = `
        <div style="font-family: sans-serif; text-align: center;">
            <h2>${heading}</h2>
            <p>${intro}</p>
            <p>O link expira em 72 horas.</p>
            <p style="margin: 32px 0;">
                <a href="${safeLink}" style="background: #111; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">${buttonLabel}</a>
            </p>
            <p style="font-size: 12px; color: #666;">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${safeLink}</p>
        </div>
    `;

    try {
        await deliver(to, subject, html);
    } catch (error) {
        console.error(`[mailer] Failed to send e-mail to ${to}:`, error);

        // Com EMAIL_VERIFICATION=off o remetente de teste do Resend so entrega
        // para o dono da conta: o link vai para o log para nao travar o fluxo.
        if (!emailVerificationEnabled) {
            console.log(`[mailer] ${subject} -> ${to}: link ${link}`);
            return;
        }

        throw new AppError("Não foi possível enviar o convite para esse e-mail. Tente novamente mais tarde.", 502);
    }
}

// Convite do profissional cadastrado pela academia: o link abre a pagina
// "ativar conta" do app web, onde ele cria a senha e depois entra no app.
export function sendProfessionalInviteEmail(to: string, gymName: string, link: string) {
    return sendInviteLinkEmail({
        to,
        subject: `${gymName} convidou você para a LSG FIT`,
        heading: "Ative sua conta de profissional",
        intro: `A academia <strong>${escapeHtml(gymName)}</strong> cadastrou você como profissional na LSG FIT. Clique no botão abaixo para criar a sua senha.`,
        buttonLabel: "Criar minha senha",
        link,
    });
}

// Convite para administrar a academia no app web: o link abre a pagina
// "aceitar convite", onde a pessoa cria a senha e ja entra no painel.
export function sendGymMemberInviteEmail(to: string, gymName: string, invitedBy: string, link: string) {
    return sendInviteLinkEmail({
        to,
        subject: `Convite para administrar ${gymName} na LSG FIT`,
        heading: "Você foi convidado para o painel da academia",
        intro: `<strong>${escapeHtml(invitedBy)}</strong> convidou você para administrar a academia <strong>${escapeHtml(gymName)}</strong> na LSG FIT. Clique no botão abaixo para criar a sua senha.`,
        buttonLabel: "Aceitar convite",
        link,
    });
}
