import type { Request, Response } from "express";
import {
    clearSessionCookie,
    listSessions,
    revokeAllSessions,
    revokeSession,
    type AccountType,
    type ResolvedSession,
} from "../utils/session.js";
import { handleError } from "../utils/app-error.js";

// Rotas de sessão das contas logadas (docs/contrato-api.md, seção 3).

function accountTypeOf(req: Request): AccountType {
    return req.userRole === "GYM" ? "gym" : "user";
}

export class SessionManagementController {
    async csrf(req: Request, res: Response): Promise<Response> {
        // Sessão resolvida pelo ensureAuthenticated. Bearer não tem CSRF (null).
        const session = res.locals["session"] as ResolvedSession | undefined;
        return res.status(200).json({ csrfToken: session?.csrfToken ?? null });
    }

    async list(req: Request, res: Response): Promise<Response> {
        try {
            const sessions = await listSessions(accountTypeOf(req), req.userId, req.sessionId);
            return res.status(200).json(sessions);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async revokeOne(req: Request, res: Response): Promise<Response> {
        try {
            const rawId = req.params["id"];
            const sessionId = rawId === "current" ? req.sessionId : String(rawId);
            const revoked = await revokeSession(accountTypeOf(req), req.userId, sessionId);

            if (!revoked) {
                return res.status(404).json({ message: "Sessão não encontrada." });
            }

            if (sessionId === req.sessionId && req.sessionTransport === "cookie") {
                clearSessionCookie(res);
            }

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    async revokeAll(req: Request, res: Response): Promise<Response> {
        try {
            await revokeAllSessions(accountTypeOf(req), req.userId);

            if (req.sessionTransport === "cookie") {
                clearSessionCookie(res);
            }

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }
}
