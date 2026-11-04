import { createClient } from "redis";

// Cliente Redis compartilhado (sessões e rate limit).
//
// - `disableOfflineQueue`: sem conexão, os comandos falham na hora em vez de
//   ficarem presos na fila. Assim o rate limit deixa passar e a sessão
//   responde erro sem travar a requisição.
// - A reconexão é automática (até 5 s entre tentativas). Os erros são
//   registrados uma vez por queda, para não inundar o log.

const REDIS_URL = process.env["REDIS_URL"];

/** Endereço do Redis sem usuário e senha, para mensagens de log. */
export function redisAddress(url = REDIS_URL): string {
    if (!url) return "(REDIS_URL não definida)";
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`;
    } catch {
        return "(REDIS_URL inválida)";
    }
}

export const redis = createClient({
    ...(REDIS_URL ? { url: REDIS_URL } : {}),
    disableOfflineQueue: true,
    socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => Math.min(250 * 2 ** retries, 5000),
    },
});

let reportedFailure = false;

function reportFailure(error: unknown): void {
    if (reportedFailure) return;
    reportedFailure = true;
    const detail = (error instanceof Error ? error.message : String(error)).replace(/\.+$/, "");
    console.error(
        `[redis] Falha na conexão com ${redisAddress()}: ${detail}. ` +
            "Tentando reconectar; enquanto isso, sessões respondem erro e o rate limit fica desligado.",
    );
}

redis.on("error", reportFailure);

redis.on("ready", () => {
    reportedFailure = false;
    console.log(`[redis] Conectado em ${redisAddress()}`);
});

/**
 * Abre a conexão na inicialização do servidor. Nunca lança: sem Redis o
 * servidor sobe mesmo assim e o cliente continua tentando reconectar.
 */
export async function connectRedis(): Promise<void> {
    if (!REDIS_URL) {
        console.error("[redis] REDIS_URL não definida. Sessões ficarão indisponíveis e o rate limit desligado.");
        return;
    }
    if (redis.isOpen) return;

    try {
        await redis.connect();
    } catch (error) {
        reportFailure(error);
        // Se a primeira conexão for recusada (ex.: senha errada), o cliente
        // desiste; tenta de novo daqui a pouco, sem segurar o processo.
        if (!redis.isOpen) setTimeout(() => void connectRedis(), 5000).unref();
    }
}

/** Fecha a conexão (scripts e encerramento do servidor). */
export async function disconnectRedis(): Promise<void> {
    if (redis.isOpen) await redis.close();
}
