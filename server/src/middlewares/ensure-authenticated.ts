import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { prisma } from "../database/prisma.js";
import { handleError } from "../utils/app-error.js";
import { resolveSession, SESSION_COOKIE, type ActorRole, type ResolvedSession } from "../utils/session.js";
import { CSRF_INVALID_BODY, isWebOrigin } from "./check-web-origin.js";
import { authenticatedRateLimit } from "./rate-limit.js";

// Autenticação das rotas protegidas (docs/contrato-api.md, seções 2.6 e 2.7).
// 1. Bearer (mobile) ou cookie `sid` (web), nessa ordem.
// 2. Sessão por cookie em método que altera dados: exige X-CSRF-Token e Origin.
// 3. Rate limit por conta.
// A sessão resolvida fica em `res.locals.session` (usado em GET /sessions/csrf).

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SESSION_EXPIRED_BODY = {
    message: "Sessão inválida ou expirada. Entre novamente.",
    code: "SESSION_EXPIRED",
} as const;

export function readCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(";")) {
        const [key, ...value] = part.trim().split("=");
        if (key !== name) continue;
        try {
            return decodeURIComponent(value.join("="));
        } catch {
            return undefined;
        }
    }
    return undefined;
}

function bearerToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (!header) return undefined;
    const [scheme, token] = header.trim().split(/\s+/);
    return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
}

function sameSecret(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

function csrfIsValid(req: Request, session: ResolvedSession): boolean {
    const header = req.get("X-CSRF-Token");
    return Boolean(header && session.csrfToken && sameSecret(header, session.csrfToken) && isWebOrigin(req.headers.origin));
}

/** Executa uma lista de middlewares em sequência e chama `done` no fim. */
function runChain(handlers: RequestHandler[], req: Request, res: Response, done: NextFunction): void {
    let index = 0;
    const step = (error?: unknown): void => {
        if (error) return done(error);
        const handler = handlers[index++];
        if (!handler) return done();
        Promise.resolve(handler(req, res, step)).catch(step);
    };
    step();
}

export async function ensureAuthenticated(req: Request, res: Response, next: NextFunction): Promise<void> {
    const bearer = bearerToken(req);
    const cookie = bearer ? undefined : readCookie(req, SESSION_COOKIE);
    const token = bearer ?? cookie;

    if (!token) {
        res.status(401).json(SESSION_EXPIRED_BODY);
        return;
    }

    let session: ResolvedSession | null;
    try {
        session = await resolveSession(token, bearer ? "bearer" : "cookie", req, res);
    } catch (error) {
        handleError(error, res);
        return;
    }

    if (!session) {
        res.status(401).json(SESSION_EXPIRED_BODY);
        return;
    }

    if (session.transport === "cookie" && UNSAFE_METHODS.has(req.method) && !csrfIsValid(req, session)) {
        res.status(403).json(CSRF_INVALID_BODY);
        return;
    }

    req.userId = session.accountId;
    req.userRole = session.role;
    if (session.gymId) req.gymId = session.gymId;
    req.sessionId = session.sessionId;
    req.sessionTransport = session.transport;
    res.locals["session"] = session;

    runChain(authenticatedRateLimit, req, res, next);
}

// Usar depois de ensureAuthenticated, para restringir uma rota a determinados papeis.
export function restrictTo(...allowedRoles: ActorRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!allowedRoles.includes(req.userRole)) {
            res.status(403).json({ message: "Acesso negado para este tipo de conta.", code: "FORBIDDEN_ROLE" });
            return;
        }

        next();
    };
}

// Usar depois de restrictTo("GYM"): só o dono (OWNER) da academia passa.
// O papel é lido do banco a cada requisição, não da sessão.
export async function restrictToGymOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const member = await prisma.gymMember.findUnique({ where: { id: req.userId }, select: { role: true } });

        if (member?.role !== "OWNER") {
            res.status(403).json({ message: "Só o dono da academia pode fazer isso.", code: "FORBIDDEN_ROLE" });
            return;
        }

        next();
    } catch (error) {
        handleError(error, res);
    }
}
