// Verificação da infraestrutura de sessão contra um Redis real.
//
// Uso (na pasta server/):
//   npx tsx scripts/check-sessions.ts            # Redis do .env.local, database 1
//   npx tsx scripts/check-sessions.ts --offline  # simula Redis fora do ar
//
// Sobe um app Express mínimo numa porta livre, com as peças reais (sessão,
// ensureAuthenticated, rate limit, checkWebOrigin e rotas de gerenciamento),
// e confere o comportamento do contrato (docs/contrato-api.md, seções 2, 3 e 6).
// Inatividade, absoluto e rotação são simulados alterando os dados no Redis
// (TTL e datas), sem esperar os tempos reais.
// No fim, apaga as chaves que criou.

import { config } from "dotenv";
import type { Request, Response } from "express";
import type { AddressInfo } from "node:net";

config({ path: ".env.local" });

const offline = process.argv.includes("--offline");

function withDatabase(url: string, db: string): string {
    const parsed = new URL(url);
    parsed.pathname = `/${db}`;
    return parsed.toString();
}

if (offline) {
    process.env["REDIS_URL"] = "redis://127.0.0.1:1";
} else {
    const url = process.env["REDIS_URL"];
    if (!url) {
        console.error("REDIS_URL não definida em .env.local.");
        process.exit(1);
    }
    process.env["REDIS_URL"] = withDatabase(url, process.env["CHECK_REDIS_DB"] ?? "1");
}
process.env["WEB_ORIGIN"] = "http://web.test";
process.env["COOKIE_SECURE"] = "false";

const express = (await import("express")).default;
const { redis, connectRedis, disconnectRedis, redisAddress } = await import("../src/utils/redis.js");
const session = await import("../src/utils/session.js");
const { ensureAuthenticated, restrictTo } = await import("../src/middlewares/ensure-authenticated.js");
const { checkWebOrigin } = await import("../src/middlewares/check-web-origin.js");
const { globalRateLimit, loginRateLimit } = await import("../src/middlewares/rate-limit.js");
const { SessionManagementController } = await import("../src/controllers/session-management.controller.js");

// ---------------------------------------------------------------------------
// App de teste

const app = express();
app.use(globalRateLimit);
app.use(express.json());

// Cria sessões sem banco: a conta vem do corpo.
app.post("/test/session", async (req, res) => {
    try {
        const started = await session.startSession(req, res, req.body);
        res.status(201).json(started);
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        res.status(status).json({ message: (error as Error).message });
    }
});

// Login falso: senha "certa" responde 200, qualquer outra 401.
app.post("/test/login", loginRateLimit, (req: Request, res: Response) => {
    if (req.body?.password === "certa") return res.status(200).json({ ok: true });
    return res.status(401).json({ message: "E-mail ou senha inválidos." });
});

app.post("/test/gym-public", checkWebOrigin, (_req, res) => res.status(200).json({ ok: true }));
app.get("/test/me", ensureAuthenticated, (req, res) => res.json({ id: req.userId, role: req.userRole }));
app.post("/test/me", ensureAuthenticated, (_req, res) => res.json({ ok: true }));
app.get("/test/gym-only", ensureAuthenticated, restrictTo("GYM"), (_req, res) => res.json({ ok: true }));

const sessions = new SessionManagementController();
app.get("/sessions/csrf", ensureAuthenticated, sessions.csrf);
app.get("/sessions", ensureAuthenticated, sessions.list);
app.delete("/sessions", ensureAuthenticated, sessions.revokeAll);
app.delete("/sessions/:id", ensureAuthenticated, sessions.revokeOne);

// ---------------------------------------------------------------------------
// Utilitários

let failures = 0;
function check(condition: unknown, description: string): void {
    if (condition) console.log(`  ok   ${description}`);
    else {
        failures++;
        console.log(`  FALHA ${description}`);
    }
}

const server = app.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

type Call = { status: number; body: any; headers: Headers; cookie: string | null };

async function call(
    method: string,
    path: string,
    options: { body?: unknown; bearer?: string; cookie?: string; headers?: Record<string, string> } = {},
): Promise<Call> {
    const headers: Record<string, string> = { ...options.headers };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.bearer) headers["Authorization"] = `Bearer ${options.bearer}`;
    if (options.cookie) headers["Cookie"] = `sid=${options.cookie}`;
    const response = await fetch(base + path, {
        method,
        headers,
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
    const text = await response.text();
    const setCookie = response.headers.get("set-cookie");
    const sid = setCookie ? /sid=([^;]*)/.exec(setCookie)?.[1] ?? null : null;
    return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers, cookie: sid };
}

const run = `check-${Date.now()}`;
const createdSessions = new Set<string>();

async function createSession(input: Record<string, unknown>, headers: Record<string, string> = {}) {
    const result = await call("POST", "/test/session", { body: input, headers });
    if (result.body?.sessionId) createdSessions.add(result.body.sessionId);
    return result;
}

const web = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" };
const webWrite = (csrf: string) => ({ "X-CSRF-Token": csrf, Origin: "http://web.test" });

// ---------------------------------------------------------------------------

async function offlineChecks(): Promise<void> {
    console.log("\nRedis fora do ar");
    const login = await call("POST", "/test/login", { body: { email: "a@a.com", password: "errada" } });
    check(login.status === 401, `rate limit deixa passar (status ${login.status})`);
    const created = await createSession({ accountType: "user", accountId: "x", role: "STUDENT" });
    check(created.status === 503, `criar sessão responde 503 (status ${created.status})`);
    const me = await call("GET", "/test/me", { bearer: "qualquer" });
    check(me.status === 503 && typeof me.body?.message === "string", `rota autenticada responde 503 (status ${me.status})`);
}

async function onlineChecks(): Promise<void> {
    const student = `${run}-aluno`;
    const gym = `${run}-academia`;

    console.log("\nSessão bearer (mobile)");
    const mobile = await createSession(
        { accountType: "user", accountId: student, role: "STUDENT" },
        { "User-Agent": "okhttp/4.12.0", "X-Device-Name": "Pixel 8 · Android 15" },
    );
    check(mobile.status === 201 && mobile.body.token && !mobile.body.csrfToken && !mobile.cookie, "devolve token, sem cookie e sem CSRF");
    const bearer: string = mobile.body.token;
    check((await call("GET", "/test/me", { bearer })).body?.role === "STUDENT", "GET autenticado com Bearer");
    check((await call("POST", "/test/me", { bearer })).status === 200, "POST com Bearer não exige CSRF");
    check((await call("GET", "/sessions/csrf", { bearer })).body?.csrfToken === null, "GET /sessions/csrf → null");
    check((await call("GET", "/test/me", { cookie: bearer })).status === 401, "token bearer não vale como cookie");
    check((await call("GET", "/test/gym-only", { bearer })).body?.code === "FORBIDDEN_ROLE", "restrictTo → 403 FORBIDDEN_ROLE");
    const tokenKeys = await redis.keys(`session-token:*`);
    check(!tokenKeys.some((key) => key.includes(bearer)), "token não aparece em claro nas chaves");
    const mobileTtl = await redis.pTTL(`session:${mobile.body.sessionId}`);
    check(Math.abs(mobileTtl - 30 * 86_400_000) < 60_000, `TTL mobile = 30 dias (${Math.round(mobileTtl / 3_600_000)} h)`);
    check((await call("GET", "/test/me")).body?.code === "SESSION_EXPIRED", "sem token → 401 SESSION_EXPIRED");

    console.log("\nSessão cookie (web)");
    const webLogin = await createSession({ accountType: "gym", accountId: gym, role: "GYM" }, web);
    const setCookie = webLogin.headers.get("set-cookie") ?? "";
    check(webLogin.body.csrfToken && !webLogin.body.token && webLogin.cookie, "devolve csrfToken e define o cookie");
    check(/HttpOnly/i.test(setCookie) && /SameSite=Lax/i.test(setCookie) && /Path=\//.test(setCookie), `cookie HttpOnly, SameSite=Lax, Path=/`);
    check(!/Max-Age/i.test(setCookie) && !/Secure/i.test(setCookie), "sem lembrar: sem Max-Age; COOKIE_SECURE=false: sem Secure");
    let cookie = webLogin.cookie!;
    const csrf: string = webLogin.body.csrfToken;
    const webTtl = await redis.pTTL(`session:${webLogin.body.sessionId}`);
    check(Math.abs(webTtl - 3_600_000) < 60_000, `TTL web sem lembrar = 1 h (${Math.round(webTtl / 60_000)} min)`);
    check((await call("GET", "/test/me", { cookie })).body?.role === "GYM", "GET com cookie");
    check((await call("GET", "/sessions/csrf", { cookie })).body?.csrfToken === csrf, "GET /sessions/csrf devolve o token da sessão");
    const noCsrf = await call("POST", "/test/me", { cookie, headers: { Origin: "http://web.test" } });
    check(noCsrf.status === 403 && noCsrf.body?.code === "CSRF_INVALID", "POST sem X-CSRF-Token → 403 CSRF_INVALID");
    const wrongCsrf = await call("POST", "/test/me", { cookie, headers: { "X-CSRF-Token": "x", Origin: "http://web.test" } });
    check(wrongCsrf.status === 403, "POST com X-CSRF-Token errado → 403");
    const badOrigin = await call("POST", "/test/me", { cookie, headers: { "X-CSRF-Token": csrf, Origin: "http://mal.test" } });
    check(badOrigin.status === 403 && badOrigin.body?.code === "CSRF_INVALID", "POST com Origin errado → 403 CSRF_INVALID");
    const noOrigin = await call("POST", "/test/me", { cookie, headers: { "X-CSRF-Token": csrf } });
    check(noOrigin.status === 403, "POST sem Origin → 403");
    check((await call("POST", "/test/me", { cookie, headers: webWrite(csrf) })).status === 200, "POST com CSRF e Origin certos → 200");

    const remembered = await createSession({ accountType: "gym", accountId: gym, role: "GYM", remember: true }, web);
    const rememberedCookie = remembered.headers.get("set-cookie") ?? "";
    const maxAge = Number(/Max-Age=(\d+)/i.exec(rememberedCookie)?.[1]);
    check(Math.abs(maxAge - 30 * 86_400) < 60, `com lembrar: Max-Age = 30 dias (${maxAge} s)`);
    const rememberedTtl = await redis.pTTL(`session:${remembered.body.sessionId}`);
    check(Math.abs(rememberedTtl - 86_400_000) < 60_000, "TTL web com lembrar = 1 dia");

    console.log("\nOrigin nas rotas públicas da academia (checkWebOrigin)");
    check((await call("POST", "/test/gym-public", { body: {} })).status === 200, "sem Origin → passa");
    check((await call("POST", "/test/gym-public", { body: {}, headers: { Origin: "http://web.test" } })).status === 200, "Origin certo → passa");
    const publicBad = await call("POST", "/test/gym-public", { body: {}, headers: { Origin: "http://mal.test" } });
    check(publicBad.status === 403 && publicBad.body?.code === "CSRF_INVALID", "Origin errado → 403 CSRF_INVALID");

    console.log("\nListagem e revogação");
    const second = await createSession(
        { accountType: "user", accountId: student, role: "STUDENT" },
        { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", "X-Forwarded-For": "1.2.3.4" },
    );
    // Simula o IP do último acesso (o app de teste não confia em proxy).
    await redis.hSet(`session:${second.body.sessionId}`, "ip", "::ffff:177.10.20.30");
    await call("GET", "/test/me", { bearer });
    const list = await call("GET", "/sessions", { bearer });
    check(list.status === 200 && list.body.length === 2, `lista 2 sessões do aluno (${list.body?.length})`);
    check(list.body[0]?.current === true && list.body[0]?.id === mobile.body.sessionId, "ordenada por lastActiveAt, atual primeiro");
    check(list.body[0]?.deviceName === "Pixel 8 · Android 15", "deviceName do X-Device-Name");
    check(list.body[0]?.ip === "127.xx.xx.1", `IP mascarado (${list.body[0]?.ip})`);
    const iphone = list.body[1];
    check(iphone?.ip === "177.xx.xx.30", `IPv4 mapeado mascarado como IPv4 (${iphone?.ip})`);
    check(iphone?.device?.os === "iOS" && iphone?.device?.type === "mobile" && iphone?.device?.browser === "Mobile Safari", `device do User-Agent (${JSON.stringify(iphone?.device)})`);
    check(!JSON.stringify(list.body).includes(bearer), "token não aparece na listagem");
    const gymList = await call("GET", "/sessions", { cookie });
    check(gymList.body?.[0]?.device?.type === "desktop" && gymList.body?.[0]?.device?.browser === "Chrome", "User-Agent de desktop → type desktop");
    check(session.maskIp("2804:14c:65a1:4000::1") === "2804:14c:xxxx…", "máscara IPv6");
    check(session.maskIp("::1") === "0:0:xxxx…", "máscara IPv6 abreviado");

    const other = await call("DELETE", `/sessions/${webLogin.body.sessionId}`, { bearer });
    check(other.status === 404, "DELETE de sessão de outra conta → 404");
    check((await call("DELETE", "/sessions/nao-existe", { bearer })).status === 404, "DELETE de sessão inexistente → 404");
    check((await call("DELETE", `/sessions/${second.body.sessionId}`, { bearer })).status === 204, "DELETE /sessions/:id → 204");
    check((await call("GET", "/sessions", { bearer })).body.length === 1, "sessão revogada some da listagem");

    const expiredId = (await createSession({ accountType: "user", accountId: student, role: "STUDENT" })).body.sessionId;
    await redis.del(`session:${expiredId}`);
    await call("GET", "/sessions", { bearer });
    check(!(await redis.sIsMember(`account-sessions:user:${student}`, expiredId)), "listagem limpa ids expirados do conjunto");

    const third = await createSession({ accountType: "user", accountId: student, role: "STUDENT" });
    const all = await call("DELETE", "/sessions", { bearer });
    check(all.status === 204, "DELETE /sessions → 204");
    check((await call("GET", "/test/me", { bearer })).status === 401, "sessão atual derrubada");
    check((await call("GET", "/test/me", { bearer: third.body.token })).status === 401, "outras sessões derrubadas");

    const logout = await call("DELETE", "/sessions/current", { cookie, headers: webWrite(csrf) });
    check(logout.status === 204 && /sid=;/.test(logout.headers.get("set-cookie") ?? "") && /Max-Age=0/i.test(logout.headers.get("set-cookie") ?? ""), "logout por cookie → 204 e sid=; Max-Age=0");
    check((await call("GET", "/test/me", { cookie })).status === 401, "cookie não vale depois do logout");
    const logoutNoCsrf = await call("DELETE", "/sessions/current", { cookie: remembered.cookie!, headers: { Origin: "http://web.test" } });
    check(logoutNoCsrf.status === 403, "DELETE por cookie sem CSRF → 403");

    const keep = await createSession({ accountType: "user", accountId: student, role: "STUDENT" });
    const drop = await createSession({ accountType: "user", accountId: student, role: "STUDENT" });
    await session.revokeAllSessions("user", student, { exceptSessionId: keep.body.sessionId });
    check((await call("GET", "/test/me", { bearer: keep.body.token })).status === 200, "revokeAllSessions com exceptSessionId mantém a sessão");
    check((await call("GET", "/test/me", { bearer: drop.body.token })).status === 401, "revokeAllSessions derruba as outras");

    console.log("\nInatividade e absoluto");
    const idle = await createSession({ accountType: "user", accountId: student, role: "STUDENT" });
    await call("GET", "/test/me", { bearer: idle.body.token });
    // Simula o fim da inatividade: TTL curto, como se o tempo tivesse passado.
    await redis.pExpire(`session:${idle.body.sessionId}`, 50);
    await new Promise((resolve) => setTimeout(resolve, 150));
    check((await call("GET", "/test/me", { bearer: idle.body.token })).status === 401, "sem acesso dentro do TTL → 401");
    const renewed = await createSession({ accountType: "user", accountId: student, role: "STUDENT" });
    await redis.pExpire(`session:${renewed.body.sessionId}`, 5_000);
    await call("GET", "/test/me", { bearer: renewed.body.token });
    check((await redis.pTTL(`session:${renewed.body.sessionId}`)) > 29 * 86_400_000, "requisição renova o TTL");
    const absolute = await createSession({ accountType: "gym", accountId: gym, role: "GYM" }, web);
    await redis.hSet(`session:${absolute.body.sessionId}`, "createdAt", new Date(Date.now() - 25 * 3_600_000).toISOString());
    check((await call("GET", "/test/me", { cookie: absolute.cookie! })).status === 401, "absoluto vencido (web 1 dia) → 401");
    check(!(await redis.exists(`session:${absolute.body.sessionId}`)), "sessão vencida é apagada");
    const nearEnd = await createSession({ accountType: "gym", accountId: gym, role: "GYM" }, web);
    await redis.hSet(`session:${nearEnd.body.sessionId}`, "createdAt", new Date(Date.now() - 86_400_000 + 600_000).toISOString());
    await call("GET", "/test/me", { cookie: nearEnd.cookie! });
    const nearTtl = await redis.pTTL(`session:${nearEnd.body.sessionId}`);
    check(nearTtl <= 600_000 && nearTtl > 590_000, `TTL limitado ao absoluto restante (${Math.round(nearTtl / 1000)} s)`);

    console.log("\nRotação (cookie)");
    const rot = await createSession({ accountType: "gym", accountId: gym, role: "GYM", remember: true }, web);
    const rotId: string = rot.body.sessionId;
    const oldToken = rot.cookie!;
    const noRotation = await call("GET", "/test/me", { cookie: oldToken });
    check(noRotation.status === 200 && !noRotation.cookie, "antes de 15 min não rotaciona");
    await redis.hSet(`session:${rotId}`, "rotatedAt", new Date(Date.now() - 16 * 60_000).toISOString());
    const [rotated, parallel] = await Promise.all([
        call("GET", "/test/me", { cookie: oldToken }),
        call("GET", "/test/me", { cookie: oldToken }),
    ]);
    const newTokens = [rotated.cookie, parallel.cookie].filter(Boolean);
    check(rotated.status === 200 && parallel.status === 200 && newTokens.length === 1, `após 15 min: um único Set-Cookie novo entre requisições paralelas (${newTokens.length})`);
    const newToken = newTokens[0]!;
    check(newToken !== oldToken && /Max-Age=\d+/.test((rotated.cookie ? rotated : parallel).headers.get("set-cookie") ?? ""), "token novo, com Max-Age (lembrar)");
    check((await call("GET", "/test/me", { cookie: newToken })).status === 200, "token novo funciona");
    check((await call("GET", "/test/me", { cookie: oldToken })).status === 200, "token antigo vale na tolerância");
    const graceTtl = await redis.pTTL(`session-token:${session.hashToken(oldToken)}`);
    check(graceTtl > 0 && graceTtl <= 60_000, `tolerância do token antigo ≤ 60 s (${graceTtl} ms)`);
    check((await call("GET", "/sessions/csrf", { cookie: newToken })).body?.csrfToken === rot.body.csrfToken, "rotação mantém o csrfToken");
    const listed = (await call("GET", "/sessions", { cookie: newToken })).body.find((s: any) => s.id === rotId);
    check(listed?.createdAt === (await redis.hGet(`session:${rotId}`, "createdAt")), "rotação mantém o sessionId e o createdAt");
    // Simula o fim da tolerância de 60 s.
    await redis.del(`session-token:${session.hashToken(oldToken)}`);
    const reuse = await call("GET", "/test/me", { cookie: oldToken });
    check(reuse.status === 401 && reuse.body?.code === "SESSION_EXPIRED", "token antigo após a tolerância → 401 SESSION_EXPIRED");
    check((await call("GET", "/test/me", { cookie: newToken })).status === 401, "reuso revoga a sessão inteira (token novo também cai)");

    const bearerRot = await createSession({ accountType: "user", accountId: student, role: "STUDENT" });
    await redis.hSet(`session:${bearerRot.body.sessionId}`, "rotatedAt", new Date(Date.now() - 16 * 60_000).toISOString());
    const bearerCall = await call("GET", "/test/me", { bearer: bearerRot.body.token });
    check(bearerCall.status === 200 && !bearerCall.cookie, "bearer não rotaciona");

    console.log("\nRate limit do login");
    const email = `${run}@Teste.com`;
    const correct = await call("POST", "/test/login", { body: { email, password: "certa" } });
    check(correct.status === 200, "login certo não conta");
    let last: Call | undefined;
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
        last = await call("POST", "/test/login", { body: { email: email.toLowerCase(), password: "errada" } });
        statuses.push(last.status);
    }
    check(statuses.slice(0, 5).every((s) => s === 401) && statuses[5] === 429, `5 falhas → 401; 6ª → 429 (${statuses.join(", ")})`);
    check(last?.body?.code === "RATE_LIMITED" && /^Muitas tentativas\. Tente novamente em \d+ minutos?\.$/.test(last?.body?.message), `corpo 429: ${JSON.stringify(last?.body)}`);
    check(Number(last?.headers.get("retry-after")) > 0, `Retry-After: ${last?.headers.get("retry-after")}`);
    check(Boolean(last?.headers.get("ratelimit")), `RateLimit: ${last?.headers.get("ratelimit")}`);
    const rlKeys = await redis.keys("rl:login-email-ip:*");
    check(rlKeys.length > 0 && rlKeys.every((key) => /^rl:login-email-ip:[0-9a-f]{64}:/.test(key)), "chave rl: com e-mail em sha256");
    check((await call("POST", "/test/login", { body: { email: `${run}-outro@teste.com`, password: "errada" } })).status === 401, "outro e-mail no mesmo IP continua liberado");
}

// ---------------------------------------------------------------------------

async function cleanup(): Promise<void> {
    if (!redis.isReady) return;
    for (const sessionId of createdSessions) await redis.del(`session:${sessionId}`);
    for (const pattern of ["session-token:*", "session-retired:*", "session-rotate-lock:*"]) {
        for (const key of await redis.keys(pattern)) {
            const value = await redis.get(key).catch(() => null);
            if ((value && createdSessions.has(value)) || pattern === "session-rotate-lock:*") await redis.del(key);
        }
    }
    for (const key of await redis.keys(`account-sessions:*:${run}-*`)) await redis.del(key);
    for (const key of await redis.keys("rl:*")) await redis.del(key);
}

try {
    console.log(`Redis: ${redisAddress()}`);
    if (offline) {
        void connectRedis();
        await offlineChecks();
    } else {
        await connectRedis();
        if (!redis.isReady) throw new Error("Redis não conectou.");
        await onlineChecks();
    }
} catch (error) {
    failures++;
    console.error(error);
} finally {
    await cleanup().catch((error) => console.error("Falha na limpeza:", error));
    server.close();
    if (offline) await redis.destroy();
    else await disconnectRedis();
}

console.log(failures === 0 ? "\nTudo certo." : `\n${failures} verificação(ões) falharam.`);
process.exit(failures === 0 ? 0 : 1);
