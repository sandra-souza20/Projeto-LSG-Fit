import { randomBytes, randomUUID } from "node:crypto";
import type { Request, Response } from "express";

// Interface da sessão (contrato em docs/contrato-api.md, seção 2).
//
// ATENÇÃO: implementação PROVISÓRIA em memória, só para o resto do servidor
// compilar e ser testado. Será trocada pela implementação com Redis
// (rotação, inatividade, absoluto, CSRF, listagem). As assinaturas exportadas
// abaixo são o contrato entre os módulos e não devem mudar.

export type AccountType = "user" | "gym";
export type ActorRole = "STUDENT" | "PROFESSIONAL" | "GYM";
export type SessionTransport = "cookie" | "bearer";

export type StartSessionInput = {
    accountType: AccountType;
    accountId: string;
    role: ActorRole;
    // Só para a academia (web): "Lembrar deste dispositivo".
    remember?: boolean;
};

export type StartedSession = {
    sessionId: string;
    // Mobile (bearer): token para o corpo da resposta.
    token?: string;
    // Web (cookie): token CSRF para o corpo da resposta.
    csrfToken?: string;
};

export type ResolvedSession = {
    sessionId: string;
    accountType: AccountType;
    accountId: string;
    role: ActorRole;
    transport: SessionTransport;
    csrfToken: string | null;
};

export type SessionListItem = {
    id: string;
    current: boolean;
    device: { browser: string | null; os: string | null; type: "desktop" | "mobile" | "tablet" | null };
    deviceName: string | null;
    ip: string | null;
    remember: boolean;
    createdAt: string;
    lastActiveAt: string;
};

export const SESSION_COOKIE = "sid";

type StoredSession = ResolvedSession & { remember: boolean; createdAt: Date; lastActiveAt: Date };

const sessionsByToken = new Map<string, StoredSession>();

/**
 * Cria uma sessão nova para a conta.
 * - role GYM: transporte cookie. Define o cookie `sid` em `res` e devolve `{ sessionId, csrfToken }`.
 * - STUDENT/PROFESSIONAL: transporte bearer. Devolve `{ sessionId, token }`.
 * Lê User-Agent, X-Device-Name e IP de `req`.
 */
export async function startSession(req: Request, res: Response, input: StartSessionInput): Promise<StartedSession> {
    void req;
    const token = randomBytes(32).toString("base64url");
    const sessionId = randomUUID();
    const transport: SessionTransport = input.role === "GYM" ? "cookie" : "bearer";
    const csrfToken = transport === "cookie" ? randomBytes(32).toString("base64url") : null;

    sessionsByToken.set(token, {
        sessionId,
        accountType: input.accountType,
        accountId: input.accountId,
        role: input.role,
        transport,
        csrfToken,
        remember: Boolean(input.remember),
        createdAt: new Date(),
        lastActiveAt: new Date(),
    });

    if (transport === "cookie") {
        res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" });
        return { sessionId, csrfToken: csrfToken! };
    }

    return { sessionId, token };
}

/** Resolve um token (do cookie ou do Bearer) para a sessão. `null` se inválido ou expirado. */
export async function resolveSession(
    token: string,
    transport: SessionTransport,
    req: Request,
    res: Response,
): Promise<ResolvedSession | null> {
    void req;
    void res;
    const session = sessionsByToken.get(token);
    if (!session || session.transport !== transport) return null;
    session.lastActiveAt = new Date();
    const { remember: _r, createdAt: _c, lastActiveAt: _l, ...resolved } = session;
    return resolved;
}

/** Lista as sessões ativas da conta. */
export async function listSessions(
    accountType: AccountType,
    accountId: string,
    currentSessionId: string,
): Promise<SessionListItem[]> {
    return [...sessionsByToken.values()]
        .filter((s) => s.accountType === accountType && s.accountId === accountId)
        .map((s) => ({
            id: s.sessionId,
            current: s.sessionId === currentSessionId,
            device: { browser: null, os: null, type: null },
            deviceName: null,
            ip: null,
            remember: s.remember,
            createdAt: s.createdAt.toISOString(),
            lastActiveAt: s.lastActiveAt.toISOString(),
        }));
}

/** Revoga uma sessão da conta pelo id público. `false` se não existir ou for de outra conta. */
export async function revokeSession(accountType: AccountType, accountId: string, sessionId: string): Promise<boolean> {
    for (const [token, s] of sessionsByToken) {
        if (s.sessionId === sessionId && s.accountType === accountType && s.accountId === accountId) {
            sessionsByToken.delete(token);
            return true;
        }
    }
    return false;
}

/** Revoga todas as sessões da conta, exceto `exceptSessionId` (se informado). */
export async function revokeAllSessions(
    accountType: AccountType,
    accountId: string,
    options: { exceptSessionId?: string } = {},
): Promise<void> {
    for (const [token, s] of sessionsByToken) {
        if (s.accountType === accountType && s.accountId === accountId && s.sessionId !== options.exceptSessionId) {
            sessionsByToken.delete(token);
        }
    }
}

/** Apaga o cookie de sessão no navegador. */
export function clearSessionCookie(res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
}
