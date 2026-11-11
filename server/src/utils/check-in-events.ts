import { redis } from "./redis.js";

// Eventos de check-in em tempo real para o painel da academia (SSE).
//
// Cada evento e publicado no Redis (canal `check-ins:<gymId>`), e cada
// instancia do servidor repassa aos navegadores conectados nela. Assim funciona
// com mais de um servidor. Se o Redis estiver fora, entrega so localmente.

export type CheckInEventType = "check-in.created" | "check-in.updated";

export type CheckInEvent = { type: CheckInEventType; checkIn: unknown };

type Listener = (event: CheckInEvent) => void;

const CHANNEL_PREFIX = "check-ins:";
const listeners = new Map<string, Set<Listener>>();

function deliver(gymId: string, event: CheckInEvent): void {
    for (const listener of listeners.get(gymId) ?? []) {
        try {
            listener(event);
        } catch {
            // Um navegador com problema nao derruba os outros.
        }
    }
}

let subscriber: ReturnType<typeof redis.duplicate> | null = null;
let subscribing: Promise<void> | null = null;

/** Conexao separada para o pub/sub (o cliente principal nao pode ficar em modo subscribe). */
async function ensureSubscriber(): Promise<void> {
    if (subscriber?.isReady) return;
    if (subscribing) return subscribing;

    subscribing = (async () => {
        try {
            subscriber = redis.duplicate();
            subscriber.on("error", () => {
                // O cliente principal ja registra as falhas de conexao.
            });
            await subscriber.connect();
            await subscriber.pSubscribe(`${CHANNEL_PREFIX}*`, (message, channel) => {
                try {
                    deliver(channel.slice(CHANNEL_PREFIX.length), JSON.parse(message) as CheckInEvent);
                } catch {
                    // Mensagem invalida: ignora.
                }
            });
        } catch {
            subscriber = null;
        } finally {
            subscribing = null;
        }
    })();

    return subscribing;
}

/** Publica um evento para os navegadores da academia. Nunca lanca. */
export async function publishCheckInEvent(gymId: string, event: CheckInEvent): Promise<void> {
    await ensureSubscriber();
    try {
        if (!subscriber?.isReady) throw new Error("sem pub/sub");
        await redis.publish(`${CHANNEL_PREFIX}${gymId}`, JSON.stringify(event));
    } catch {
        deliver(gymId, event);
    }
}

/** Registra um navegador conectado. Devolve a funcao que o remove. */
export function subscribeCheckInEvents(gymId: string, listener: Listener): () => void {
    void ensureSubscriber();
    const set = listeners.get(gymId) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(gymId, set);

    return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(gymId);
    };
}
