import type { NextFunction, Request, Response } from "express";
import { resolveSession, SESSION_COOKIE, type ActorRole } from "../utils/session.js";

// ATENÇÃO: versão provisória. A versão final também valida CSRF/Origin nas
// sessões por cookie e aplica o authenticatedRateLimit.

function readCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(";")) {
        const [key, ...value] = part.trim().split("=");
        if (key === name) return decodeURIComponent(value.join("="));
    }
    return undefined;
}

export async function ensureAuthenticated(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
    const cookie = bearer ? undefined : readCookie(req, SESSION_COOKIE);
    const token = bearer ?? cookie;

    if (!token) {
        res.status(401).json({ message: "Sessão inválida ou expirada. Entre novamente.", code: "SESSION_EXPIRED" });
        return;
    }

    const session = await resolveSession(token, bearer ? "bearer" : "cookie", req, res);

    if (!session) {
        res.status(401).json({ message: "Sessão inválida ou expirada. Entre novamente.", code: "SESSION_EXPIRED" });
        return;
    }

    req.userId = session.accountId;
    req.userRole = session.role;
    req.sessionId = session.sessionId;
    req.sessionTransport = session.transport;
    next();
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
