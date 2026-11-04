import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit, type Options, type RateLimitInfo } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../utils/redis.js";

// Limitadores de requisição (contrato em docs/contrato-api.md, seção 6).
//
// Cada limitador é um array de middlewares; as rotas aplicam assim:
// `router.post("/sessions", loginRateLimit, controller.login)`.
//
// - Contadores no Redis, com chaves `rl:<grupo>:<chave>`.
// - E-mail na chave sempre como sha256 do e-mail em minúsculas.
// - Se o Redis falhar, a requisição passa e o erro é registrado.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// O RedisStore carrega os scripts Lua no init. Aqui o carregamento fica para
// o primeiro uso (o EVALSHA falha com NOSCRIPT e o store carrega e tenta de
// novo), para o servidor subir sem erros mesmo com o Redis fora do ar.
const NO_SCRIPT_SHA = "0".repeat(40);

class LazyRedisStore extends RedisStore {
    override async init(options: Options): Promise<void> {
        this.windowMs = options.windowMs;
        // SHA que não existe no Redis: força o NOSCRIPT e o carregamento.
        this.incrementScriptSha = Promise.resolve(NO_SCRIPT_SHA);
        this.getScriptSha = Promise.resolve(NO_SCRIPT_SHA);
    }
}

function store(prefix: string): RedisStore {
    return new LazyRedisStore({
        prefix: `rl:${prefix}:`,
        sendCommand: (...args: string[]) => redis.sendCommand(args),
    });
}

function clientIp(req: Request): string {
    return ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "");
}

/** sha256 do e-mail do corpo, em minúsculas. `null` se não houver e-mail. */
function emailKey(req: Request): string | null {
    const email: unknown = req.body?.email;
    if (typeof email !== "string" || !email.trim()) return null;
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

// Erros sem stack trace e, com o Redis fora do ar, no máximo uma linha a cada
// 30 s (senão seria uma por requisição e por limitador).
let lastErrorLog = 0;
const logger = {
    error(error: unknown, message?: string) {
        const now = Date.now();
        if (now - lastErrorLog < 30_000) return;
        lastErrorLog = now;
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[rate-limit] ${message ? `${message} ` : ""}${detail}`);
    },
    warn(error: unknown, message?: string) {
        const detail = error instanceof Error ? error.message : String(error);
        console.warn(`[rate-limit] ${message ? `${message} ` : ""}${detail}`);
    },
};

type LimiterConfig = {
    name: string;
    windowMs: number;
    limit: number;
    key: (req: Request) => string | null;
    // Login: conta só as falhas (status 401).
    onlyFailures?: boolean;
};

function limiter({ name, windowMs, limit, key, onlyFailures }: LimiterConfig): RequestHandler {
    return rateLimit({
        windowMs,
        limit,
        store: store(name),
        standardHeaders: "draft-7",
        legacyHeaders: false,
        passOnStoreError: true,
        logger,
        // Sem chave (ex.: limitador por e-mail sem e-mail no corpo): não conta.
        skip: (req) => key(req) === null,
        keyGenerator: (req) => key(req) ?? "",
        ...(onlyFailures
            ? { skipSuccessfulRequests: true, requestWasSuccessful: (_req, res) => res.statusCode !== 401 }
            : {}),
        handler: (req, res) => {
            const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
            const resetTime = info?.resetTime?.getTime() ?? Date.now() + windowMs;
            const minutes = Math.max(1, Math.ceil((resetTime - Date.now()) / MINUTE));
            res.status(429).json({
                message: `Muitas tentativas. Tente novamente em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
                code: "RATE_LIMITED",
            });
        },
    });
}

/** Geral, por IP: 300/min. Aplicado em todas as rotas (index.ts). */
export const globalRateLimit: RequestHandler[] = [
    limiter({ name: "global", windowMs: MINUTE, limit: 300, key: clientIp }),
];

/** Login (só falhas): e-mail+IP 5/15min, e-mail 20/h, IP 50/h. */
export const loginRateLimit: RequestHandler[] = [
    limiter({
        name: "login-email-ip",
        windowMs: 15 * MINUTE,
        limit: 5,
        onlyFailures: true,
        key: (req) => {
            const email = emailKey(req);
            return email ? `${email}:${clientIp(req)}` : null;
        },
    }),
    limiter({ name: "login-email", windowMs: HOUR, limit: 20, onlyFailures: true, key: emailKey }),
    limiter({ name: "login-ip", windowMs: HOUR, limit: 50, onlyFailures: true, key: clientIp }),
];

/** Cadastro, por IP: 10/h. */
export const signupRateLimit: RequestHandler[] = [
    limiter({ name: "signup-ip", windowMs: HOUR, limit: 10, key: clientIp }),
];

/** Envio de e-mail (códigos e convites): e-mail 3/15min, IP 20/h. E-mail lido de `req.body.email`. */
export const emailSendRateLimit: RequestHandler[] = [
    limiter({ name: "email-send-email", windowMs: 15 * MINUTE, limit: 3, key: emailKey }),
    limiter({ name: "email-send-ip", windowMs: HOUR, limit: 20, key: clientIp }),
];

/** Validação de código, por IP: 10/15min. */
export const codeVerifyRateLimit: RequestHandler[] = [
    limiter({ name: "code-verify-ip", windowMs: 15 * MINUTE, limit: 10, key: clientIp }),
];

/** Rotas autenticadas, por conta: 120/min. Aplicado pelo ensureAuthenticated. */
export const authenticatedRateLimit: RequestHandler[] = [
    limiter({
        name: "account",
        windowMs: MINUTE,
        limit: 120,
        key: (req) => (req.userId ? `${req.userRole === "GYM" ? "gym" : "user"}:${req.userId}` : null),
    }),
];
