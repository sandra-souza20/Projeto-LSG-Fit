import { prisma } from "../database/prisma.js";
import { AppError } from "./app-error.js";

// Um e-mail pertence a uma unica conta, seja em "users" (aluno ou
// profissional) ou em "gym_members" (docs/contrato-api.md, secao 1).

export const EMAIL_IN_USE_MESSAGE = "Este e-mail já pertence a uma conta.";

/** E-mails sao comparados sem espacos e em minusculas. */
export function normalizeEmail(email: unknown): string {
    return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Lanca 409 EMAIL_IN_USE se o e-mail ja pertencer a alguma conta.
 * `ignoreUserId` permite que o proprio cadastro pendente (aluno que ainda nao
 * confirmou o e-mail) seja sobrescrito.
 */
export async function ensureEmailAvailable(email: string, options: { ignoreUserId?: string } = {}): Promise<void> {
    const [user, member] = await Promise.all([
        prisma.user.findUnique({ where: { email }, select: { id: true } }),
        prisma.gymMember.findUnique({ where: { email }, select: { id: true } }),
    ]);

    if (member || (user && user.id !== options.ignoreUserId)) {
        throw new AppError(EMAIL_IN_USE_MESSAGE, 409, "EMAIL_IN_USE");
    }
}
