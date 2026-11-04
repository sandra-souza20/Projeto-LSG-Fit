import type { NextFunction, Request, Response } from "express";

// Proteção de Origin do app web da academia (docs/contrato-api.md, seção 2.7).

/** Origem do app web (sem barra no final). `null` se WEB_ORIGIN não estiver definida. */
export const WEB_ORIGIN = process.env["WEB_ORIGIN"]?.trim().replace(/\/+$/, "") || null;

export const CSRF_INVALID_BODY = {
    message: "Requisição bloqueada por segurança. Recarregue a página e tente novamente.",
    code: "CSRF_INVALID",
} as const;

/** `true` se o header Origin for exatamente o WEB_ORIGIN. */
export function isWebOrigin(origin: string | undefined): boolean {
    return WEB_ORIGIN !== null && origin === WEB_ORIGIN;
}

/**
 * Para as rotas públicas da academia que criam sessão (`POST /gyms`,
 * `POST /gyms/sessions`, `POST /gyms/reset-password`) e `POST /gyms/forgot-password`.
 * Recusa com 403 `CSRF_INVALID` quando o header Origin está presente e é
 * diferente de WEB_ORIGIN. Sem Origin (ex.: mobile, curl), deixa passar.
 */
export function checkWebOrigin(req: Request, res: Response, next: NextFunction): void {
    const origin = req.headers.origin;

    if (origin !== undefined && !isWebOrigin(origin)) {
        res.status(403).json(CSRF_INVALID_BODY);
        return;
    }

    next();
}
