import type { Request, Response } from "express";
import { revokeAllSessions, startSession } from "./session.js";
import type { SerializedUser } from "./serializers.js";

// Atalhos sobre utils/session.ts para montar as respostas que criam sessao
// (docs/contrato-api.md, secoes 3, 4 e 5).

type SessionOptions = {
    // Redefinicao de senha e ativacao derrubam as outras sessoes da conta
    // antes de criar a nova (secao 2.5).
    revokeOthers?: boolean;
};

/** Aluno ou profissional (mobile, bearer): devolve `{ token, sessionId }`. */
export async function startUserSession(req: Request, res: Response, user: SerializedUser, options: SessionOptions = {}) {
    if (options.revokeOthers) {
        await revokeAllSessions("user", user.id);
    }

    const session = await startSession(req, res, { accountType: "user", accountId: user.id, role: user.role });

    return { token: session.token!, sessionId: session.sessionId };
}

/** Membro da academia (web, cookie): define o cookie e devolve `{ csrfToken }`. */
export async function startGymSession(
    req: Request,
    res: Response,
    member: { id: string; gymId: string },
    options: SessionOptions & { remember?: boolean } = {},
) {
    if (options.revokeOthers) {
        await revokeAllSessions("gym", member.id);
    }

    const session = await startSession(req, res, {
        accountType: "gym",
        accountId: member.id,
        role: "GYM",
        gymId: member.gymId,
        remember: Boolean(options.remember),
    });

    return { csrfToken: session.csrfToken! };
}
