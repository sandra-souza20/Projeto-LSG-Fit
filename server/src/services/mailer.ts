import nodemailer from "nodemailer";
import { Resend } from "resend";
import { AppError } from "../utils/app-error.js";

// GMAIL_USER + GMAIL_APP_PASSWORD enviam pelo SMTP do Gmail, que entrega para
// qualquer destinatario. O remetente de teste do Resend (onboarding@resend.dev)
// so entrega para o e-mail dono da conta Resend, por isso o Gmail tem prioridade.
const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_APP_PASSWORD;
const smtp = gmailUser && gmailPassword
    ? nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPassword } })
    : null;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "LSG FIT <onboarding@resend.dev>";

async function deliver(to: string, subject: string, html: string) {
    if (smtp) {
        await smtp.sendMail({ from: `LSG FIT <${gmailUser}>`, to, subject, html });
        return;
    }

    // The Resend SDK returns { data, error } instead of throwing on failure,
    // so a failed send has to be checked for explicitly here.
    const { error } = await resend!.emails.send({ from: EMAIL_FROM, to, subject, html });

    if (error) {
        throw new Error(error.message);
    }
}

async function sendCodeEmail(to: string, subject: string, heading: string, code: string) {
    if (!smtp && !resend) {
        // No e-mail provider configured: print the code to the server console
        // so registration/login flows stay testable in local development.
        console.log(`[mailer] ${subject} -> ${to}: code ${code}`);
        return;
    }

    const html = `
        <div style="font-family: sans-serif; text-align: center;">
            <h2>${heading}</h2>
            <p>Use o código abaixo no app LSG FIT. Ele expira em 15 minutos.</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</p>
        </div>
    `;

    try {
        await deliver(to, subject, html);
    } catch (error) {
        console.error(`[mailer] Failed to send e-mail to ${to}:`, error);
        throw new AppError("Não foi possível enviar o código para esse e-mail. Tente novamente mais tarde.", 502);
    }
}

export function sendVerificationCodeEmail(to: string, code: string) {
    return sendCodeEmail(to, "Confirme seu cadastro na LSG FIT", "Confirme seu e-mail", code);
}

export function sendPasswordResetCodeEmail(to: string, code: string) {
    return sendCodeEmail(to, "Redefinição de senha - LSG FIT", "Redefinir sua senha", code);
}
