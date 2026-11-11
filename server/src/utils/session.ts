import { createHash, randomBytes, randomUUID } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";
import type { CookieOptions, Request, Response } from "express";
import UAParser from "ua-parser-js";
import { AppError } from "./app-error.js";
import { redis } from "./redis.js";

// Sessão opaca guardada no Redis (contrato em docs/contrato-api.md, seção 2).
//
// Chaves:
// - `session:<sessionId>`: hash com os dados da sessão (TTL = inatividade,
//   limitado ao absoluto restante, renovado a cada requisição);
// - `session-token:<sha256(token)>`: sessionId do token atual (mesmo TTL) ou,
//   logo após uma rotação, do token anterior (TTL de 60 s de tolerância);
// - `session-retired:<sha256(token)>`: sessionId de um token aposentado pela
//   rotação, até o fim do absoluto. Usar esse token depois da tolerância
//   revoga a sessão inteira (detecção de reuso);
// - `session-rotate-lock:<sessionId>`: trava curta para só uma requisição
//   paralela fazer a rotação;
// - `account-sessions:<user|gym>:<accountId>`: conjunto de sessionId da conta
//   (na academia, a conta e o membro: gym_members.id).
//
// O token nunca é guardado em claro, só o seu sha256.

export type AccountType = "user" | "gym";
export type ActorRole = "STUDENT" | "PROFESSIONAL" | "GYM";
export type SessionTransport = "cookie" | "bearer";

export type StartSessionInput = {
    accountType: AccountType;
    // users.id ou gym_members.id.
    accountId: string;
    role: ActorRole;
    // Só para a academia: academia do membro.
    gymId?: string;
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
    // Só para a academia: academia do membro.
    gymId: string | null;
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
// Não é HttpOnly: o app web lê e envia no header X-CSRF-Token.
export const CSRF_COOKIE = "csrf_token";

// ---------------------------------------------------------------------------
// Tempos (seção 2.2)

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type SessionPolicy = { absoluteMs: number; idleMs: number; rotateMs: number | null };

/** Tempos de uma sessão conforme o transporte e o "lembrar". */
export function sessionPolicy(transport: SessionTransport, remember: boolean): SessionPolicy {
    if (transport === "bearer") return { absoluteMs: 90 * DAY, idleMs: 30 * DAY, rotateMs: null };
    if (remember) return { absoluteMs: 30 * DAY, idleMs: 1 * DAY, rotateMs: 15 * MINUTE };
    return { absoluteMs: 1 * DAY, idleMs: 1 * HOUR, rotateMs: 15 * MINUTE };
}

/** Tolerância do token antigo depois da rotação. */
export const ROTATION_GRACE_MS = 60 * 1000;

// Maior absoluto possível: validade do conjunto `account-sessions:*`.
const MAX_ABSOLUTE_MS = 90 * DAY;

// ---------------------------------------------------------------------------
// Chaves e utilitários

export const sessionKeys = {
    session: (sessionId: string) => `session:${sessionId}`,
    token: (tokenHash: string) => `session-token:${tokenHash}`,
    retired: (tokenHash: string) => `session-retired:${tokenHash}`,
    rotateLock: (sessionId: string) => `session-rotate-lock:${sessionId}`,
    account: (accountType: AccountType, accountId: string) => `account-sessions:${accountType}:${accountId}`,
};

function newToken(): string {
    return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: process.env["COOKIE_SECURE"] !== "false",
        sameSite: "lax",
        path: "/",
    };
}

function setSessionCookie(
    res: Response,
    token: string,
    csrfToken: string,
    remember: boolean,
    absoluteEnd: number,
): void {
    const options = cookieOptions();
    // Sem "lembrar": cookie de sessão do navegador (some ao fechar).
    if (remember) options.maxAge = Math.max(0, absoluteEnd - Date.now());
    res.cookie(SESSION_COOKIE, token, options);
    res.cookie(CSRF_COOKIE, csrfToken, { ...options, httpOnly: false });
}

function deviceNameOf(req: Request): string {
    const raw = req.get("X-Device-Name");
    return raw ? raw.trim().slice(0, 100) : "";
}

function userAgentOf(req: Request): string {
    return (req.get("User-Agent") ?? "").slice(0, 512);
}

function ipOf(req: Request): string {
    return req.ip ?? req.socket.remoteAddress ?? "";
}

/** Erro de infraestrutura (Redis fora do ar): a sessão não pode ser validada. */
function unavailable(error: unknown): AppError {
    console.error("[session] Redis indisponível:", error instanceof Error ? error.message : error);
    return new AppError("Serviço de sessão indisponível. Tente novamente em instantes.", 503);
}

async function withRedis<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw unavailable(error);
    }
}

// Campos do hash `session:<id>` (todos strings no Redis).
type StoredSession = {
    accountType: AccountType;
    accountId: string;
    role: ActorRole;
    // Academia do membro ("" para aluno e profissional).
    gymId: string;
    transport: SessionTransport;
    csrfToken: string;
    remember: "1" | "0";
    createdAt: string;
    rotatedAt: string;
    lastActiveAt: string;
    userAgent: string;
    deviceName: string;
    ip: string;
    // Interno: hash do token atual, para renovar o TTL e apagar na revogação.
    tokenHash: string;
};

function isComplete(data: Record<string, string>): data is StoredSession {
    const base = Boolean(
        data["accountType"] && data["accountId"] && data["role"] && data["transport"] && data["createdAt"],
    );
    // Sessão de academia sem gymId é do formato antigo (login da própria academia).
    return base && (data["accountType"] !== "gym" || Boolean(data["gymId"]));
}

function absoluteEndOf(data: StoredSession): number {
    return Date.parse(data.createdAt) + sessionPolicy(data.transport, data.remember === "1").absoluteMs;
}

/** TTL da sessão agora: a inatividade, limitada ao absoluto restante. */
function ttlOf(data: StoredSession, now: number): number {
    const policy = sessionPolicy(data.transport, data.remember === "1");
    return Math.min(policy.idleMs, absoluteEndOf(data) - now);
}

// Renova a sessão só se ela ainda existir (evita recriar uma sessão revogada
// por uma requisição em paralelo). O token renovado é sempre o atual, lido do
// próprio hash: assim uma requisição com o token antigo, em paralelo com a
// rotação, não estende a tolerância dele.
// KEYS: session. ARGV: ttl (ms), lastActiveAt, ip, deviceName ("" mantem o atual).
const TOUCH_SCRIPT = `
if redis.call("EXISTS", KEYS[1]) == 0 then return 0 end
redis.call("HSET", KEYS[1], "lastActiveAt", ARGV[2], "ip", ARGV[3])
if ARGV[4] ~= "" then redis.call("HSET", KEYS[1], "deviceName", ARGV[4]) end
redis.call("PEXPIRE", KEYS[1], ARGV[1])
local tokenHash = redis.call("HGET", KEYS[1], "tokenHash")
if tokenHash then redis.call("PEXPIRE", "session-token:" .. tokenHash, ARGV[1]) end
return 1
`;

// Rotação atômica do token. Só roda se a sessão existir e o token atual ainda
// for o informado (outra requisição pode ter rodado antes).
// KEYS: session, token antigo, token novo, aposentado.
// ARGV: hash antigo, hash novo, rotatedAt, ttl (ms), tolerância (ms), ms até o absoluto.
const ROTATE_SCRIPT = `
if redis.call("HGET", KEYS[1], "tokenHash") ~= ARGV[1] then return 0 end
local sessionId = string.sub(KEYS[1], 9)
redis.call("HSET", KEYS[1], "tokenHash", ARGV[2], "rotatedAt", ARGV[3])
redis.call("SET", KEYS[3], sessionId, "PX", ARGV[4])
redis.call("PEXPIRE", KEYS[2], math.min(tonumber(ARGV[5]), tonumber(ARGV[4])))
redis.call("SET", KEYS[4], sessionId, "PX", ARGV[6])
return 1
`;

/** Apaga a sessão e o token atual, e tira o id do conjunto da conta. */
async function destroySession(sessionId: string): Promise<void> {
    const key = sessionKeys.session(sessionId);
    const [accountType, accountId, tokenHash] = await redis.hmGet(key, ["accountType", "accountId", "tokenHash"]);
    const multi = redis.multi().del(key);
    if (tokenHash) multi.del(sessionKeys.token(tokenHash));
    if (accountType && accountId) multi.sRem(sessionKeys.account(accountType as AccountType, accountId), sessionId);
    await multi.exec();
}

// ---------------------------------------------------------------------------
// API usada pelo resto do servidor

/**
 * Cria uma sessão nova para a conta.
 * - role GYM: transporte cookie. Define o cookie `sid` em `res` e devolve `{ sessionId, csrfToken }`.
 * - STUDENT/PROFESSIONAL: transporte bearer. Devolve `{ sessionId, token }`.
 * Lê User-Agent, X-Device-Name e IP de `req`.
 */
export async function startSession(req: Request, res: Response, input: StartSessionInput): Promise<StartedSession> {
    if (input.accountType === "gym" && !input.gymId) {
        throw new Error("startSession: sessão de academia sem gymId.");
    }

    const transport: SessionTransport = input.role === "GYM" ? "cookie" : "bearer";
    const remember = transport === "cookie" && Boolean(input.remember);
    const token = newToken();
    const tokenHash = hashToken(token);
    const sessionId = randomUUID();
    const csrfToken = transport === "cookie" ? newToken() : "";
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const policy = sessionPolicy(transport, remember);
    const ttl = Math.min(policy.idleMs, policy.absoluteMs);

    const data: StoredSession = {
        accountType: input.accountType,
        accountId: input.accountId,
        role: input.role,
        gymId: input.gymId ?? "",
        transport,
        csrfToken,
        remember: remember ? "1" : "0",
        createdAt: nowIso,
        rotatedAt: nowIso,
        lastActiveAt: nowIso,
        userAgent: userAgentOf(req),
        deviceName: deviceNameOf(req),
        ip: ipOf(req),
        tokenHash,
    };

    const accountKey = sessionKeys.account(input.accountType, input.accountId);

    await withRedis(() =>
        redis
            .multi()
            .hSet(sessionKeys.session(sessionId), data)
            .pExpire(sessionKeys.session(sessionId), ttl)
            .set(sessionKeys.token(tokenHash), sessionId, { expiration: { type: "PX", value: ttl } })
            .sAdd(accountKey, sessionId)
            .pExpire(accountKey, MAX_ABSOLUTE_MS)
            .exec(),
    );

    if (transport === "cookie") {
        setSessionCookie(res, token, csrfToken, remember, now + policy.absoluteMs);
        return { sessionId, csrfToken };
    }

    return { sessionId, token };
}

/**
 * Resolve um token (do cookie ou do Bearer) para a sessão. `null` se inválido,
 * expirado ou revogado. Renova o TTL, atualiza `lastActiveAt` e `ip` e, no
 * cookie, faz a rotação periódica do token (novo `Set-Cookie` em `res`).
 * Lança AppError 503 se o Redis estiver fora do ar.
 */
export async function resolveSession(
    token: string,
    transport: SessionTransport,
    req: Request,
    res: Response,
): Promise<ResolvedSession | null> {
    return withRedis(async () => {
        const presentedHash = hashToken(token);
        const sessionId = await redis.get(sessionKeys.token(presentedHash));

        if (!sessionId) {
            // Token aposentado pela rotação e usado depois da tolerância: reuso.
            const retiredOf = await redis.get(sessionKeys.retired(presentedHash));
            if (retiredOf) {
                console.warn(`[session] Reuso de token aposentado; sessão ${retiredOf} revogada.`);
                await redis.del(sessionKeys.retired(presentedHash));
                await destroySession(retiredOf);
            }
            return null;
        }

        const data = await redis.hGetAll(sessionKeys.session(sessionId));
        if (!isComplete(data)) {
            await redis.del(sessionKeys.token(presentedHash));
            return null;
        }

        // O token de uma sessão bearer não vale como cookie, nem o contrário.
        if (data.transport !== transport) return null;

        const now = Date.now();
        const ttl = ttlOf(data, now);
        if (ttl <= 0) {
            await destroySession(sessionId);
            return null;
        }

        // Rotação (seção 2.4): só cookie, só com o token atual, e só uma
        // requisição paralela faz (trava). As demais seguem com o token
        // antigo, que vale por mais 60 s.
        const { rotateMs } = sessionPolicy(data.transport, data.remember === "1");
        if (
            rotateMs !== null &&
            presentedHash === data.tokenHash &&
            now - Date.parse(data.rotatedAt) >= rotateMs
        ) {
            const locked = await redis.set(sessionKeys.rotateLock(sessionId), "1", {
                condition: "NX",
                expiration: { type: "PX", value: 10_000 },
            });

            if (locked) {
                const rotatedToken = newToken();
                const rotatedHash = hashToken(rotatedToken);
                const absoluteEnd = absoluteEndOf(data);
                const rotated = await redis.eval(ROTATE_SCRIPT, {
                    keys: [
                        sessionKeys.session(sessionId),
                        sessionKeys.token(presentedHash),
                        sessionKeys.token(rotatedHash),
                        sessionKeys.retired(presentedHash),
                    ],
                    arguments: [
                        presentedHash,
                        rotatedHash,
                        new Date(now).toISOString(),
                        String(ttl),
                        String(ROTATION_GRACE_MS),
                        String(Math.max(1, absoluteEnd - now)),
                    ],
                });

                if (rotated === 1) {
                    setSessionCookie(res, rotatedToken, data.csrfToken, data.remember === "1", absoluteEnd);
                }
            }
        }

        const touched = await redis.eval(TOUCH_SCRIPT, {
            keys: [sessionKeys.session(sessionId)],
            // X-Device-Name atualiza o nome (ex.: app atualizado); sem o header, mantem.
            arguments: [String(ttl), new Date(now).toISOString(), ipOf(req), deviceNameOf(req)],
        });
        if (touched !== 1) return null;

        return {
            sessionId,
            accountType: data.accountType,
            accountId: data.accountId,
            role: data.role,
            gymId: data.gymId || null,
            transport: data.transport,
            csrfToken: data.csrfToken || null,
        };
    });
}

/** Lista as sessões ativas da conta. */
export async function listSessions(
    accountType: AccountType,
    accountId: string,
    currentSessionId: string,
): Promise<SessionListItem[]> {
    return withRedis(async () => {
        const accountKey = sessionKeys.account(accountType, accountId);
        const ids = await redis.sMembers(accountKey);
        if (ids.length === 0) return [];

        const multi = redis.multi();
        for (const id of ids) multi.hGetAll(sessionKeys.session(id));
        const results = (await multi.exec()) as unknown as Record<string, string>[];

        const items: SessionListItem[] = [];
        const expired: string[] = [];

        ids.forEach((id, index) => {
            const data = results[index] ?? {};
            if (!isComplete(data) || data.accountType !== accountType || data.accountId !== accountId) {
                expired.push(id);
                return;
            }
            items.push({
                id,
                current: id === currentSessionId,
                device: parseDevice(data.userAgent),
                deviceName: data.deviceName || null,
                ip: maskIp(data.ip),
                remember: data.remember === "1",
                createdAt: data.createdAt,
                lastActiveAt: data.lastActiveAt,
            });
        });

        if (expired.length > 0) await redis.sRem(accountKey, expired);

        return items.sort((a, b) => Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt));
    });
}

/** Revoga uma sessão da conta pelo id público. `false` se não existir ou for de outra conta. */
export async function revokeSession(accountType: AccountType, accountId: string, sessionId: string): Promise<boolean> {
    return withRedis(async () => {
        const [type, id] = await redis.hmGet(sessionKeys.session(sessionId), ["accountType", "accountId"]);
        if (type !== accountType || id !== accountId) return false;
        await destroySession(sessionId);
        return true;
    });
}

/** Revoga todas as sessões da conta, exceto `exceptSessionId` (se informado). */
export async function revokeAllSessions(
    accountType: AccountType,
    accountId: string,
    options: { exceptSessionId?: string } = {},
): Promise<void> {
    await withRedis(async () => {
        const ids = await redis.sMembers(sessionKeys.account(accountType, accountId));
        await Promise.all(ids.filter((id) => id !== options.exceptSessionId).map((id) => destroySession(id)));
    });
}

/** Apaga os cookies de sessão e de CSRF no navegador (`Max-Age=0`). */
export function clearSessionCookie(res: Response): void {
    res.cookie(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    res.cookie(CSRF_COOKIE, "", { ...cookieOptions(), httpOnly: false, maxAge: 0 });
}

// ---------------------------------------------------------------------------
// Listagem: dispositivo e IP mascarado

/** Navegador, sistema e tipo de dispositivo a partir do User-Agent (ua-parser-js 1.x). */
export function parseDevice(userAgent: string): SessionListItem["device"] {
    if (!userAgent) return { browser: null, os: null, type: null };

    const result = new UAParser(userAgent).getResult();
    const browser = result.browser.name ?? null;
    const os = result.os.name ?? null;
    const deviceType = result.device.type;

    let type: SessionListItem["device"]["type"] = null;
    if (deviceType === "mobile" || deviceType === "tablet") type = deviceType;
    // ua-parser não informa tipo para computadores: navegador ou sistema
    // conhecidos sem tipo de dispositivo indicam desktop.
    else if (deviceType === undefined && (browser || os)) type = "desktop";

    return { browser, os, type };
}

/** IPv4 `a.xx.xx.d`; IPv6 os 2 primeiros blocos seguidos de `:xxxx…`. */
export function maskIp(ip: string | undefined): string | null {
    if (!ip) return null;

    let address = ip.trim();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped?.[1]) address = mapped[1];

    if (isIPv4(address)) {
        const [a, , , d] = address.split(".");
        return `${a}.xx.xx.${d}`;
    }

    if (isIPv6(address)) {
        const [head = "", tail = ""] = address.split("%")[0]!.split("::");
        const headBlocks = head ? head.split(":") : [];
        const tailBlocks = tail ? tail.split(":") : [];
        const missing = 8 - headBlocks.length - tailBlocks.length;
        const blocks = address.includes("::")
            ? [...headBlocks, ...Array<string>(Math.max(0, missing)).fill("0"), ...tailBlocks]
            : headBlocks;
        const first = (blocks[0] ?? "0").toLowerCase();
        const second = (blocks[1] ?? "0").toLowerCase();
        return `${first}:${second}:xxxx…`;
    }

    return null;
}
