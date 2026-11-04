import type { RequestHandler } from "express";

// Limitadores de requisição (contrato em docs/contrato-api.md, seção 6).
//
// ATENÇÃO: implementação PROVISÓRIA (não limita nada). Será trocada pela
// versão com express-rate-limit + rate-limit-redis. Os nomes exportados são o
// contrato entre os módulos: as rotas aplicam cada um como middleware, por
// exemplo `router.post("/sessions", loginRateLimit, controller.login)`.

const passThrough: RequestHandler = (_req, _res, next) => next();

/** Geral, por IP: 300/min. Aplicado em todas as rotas (index.ts). */
export const globalRateLimit: RequestHandler[] = [passThrough];

/** Login (só falhas): e-mail+IP 5/15min, e-mail 20/h, IP 50/h. */
export const loginRateLimit: RequestHandler[] = [passThrough];

/** Cadastro, por IP: 10/h. */
export const signupRateLimit: RequestHandler[] = [passThrough];

/** Envio de e-mail (códigos e convites): e-mail 3/15min, IP 20/h. E-mail lido de `req.body.email`. */
export const emailSendRateLimit: RequestHandler[] = [passThrough];

/** Validação de código, por IP: 10/15min. */
export const codeVerifyRateLimit: RequestHandler[] = [passThrough];

/** Rotas autenticadas, por conta: 120/min. Aplicado pelo ensureAuthenticated. */
export const authenticatedRateLimit: RequestHandler[] = [passThrough];
