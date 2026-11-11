import { prisma } from "../database/prisma.js";
import type { Prisma } from "../../prisma/client/client.js";
import { todayRange } from "../utils/app-day.js";
import { publishCheckInEvent } from "../utils/check-in-events.js";

// Regras do check-in (docs/contrato-api.md, seção "Check-in"):
// - só aluno matriculado faz check-in; inativo não consegue;
// - pedido pendente expira em 15 min sem resposta;
// - aprovado vale até o fim do dia e libera um treino;
// - um treino por dia.

export const PENDING_TTL_MS = 15 * 60 * 1000;

export const CHECK_IN_INCLUDE = {
    student: { select: { id: true, name: true, email: true, professional: { select: { id: true, name: true } } } },
    decidedBy: { select: { id: true, name: true } },
} satisfies Prisma.CheckInInclude;

type CheckInRecord = Prisma.CheckInGetPayload<{ include: typeof CHECK_IN_INCLUDE }>;

export function serializeCheckIn(checkIn: CheckInRecord) {
    return {
        id: checkIn.id,
        status: checkIn.status,
        requestedAt: checkIn.requestedAt,
        // Só para pendente: quando expira sem resposta.
        expiresAt: checkIn.status === "PENDING" ? new Date(checkIn.requestedAt.getTime() + PENDING_TTL_MS) : null,
        decidedAt: checkIn.decidedAt,
        decidedBy: checkIn.decidedBy,
        denialReason: checkIn.denialReason,
        // Já foi usado num treino concluído.
        used: checkIn.workoutSessionId !== null,
        student: checkIn.student,
    };
}

export type SerializedCheckIn = ReturnType<typeof serializeCheckIn>;

/** Publica a versão atual do check-in para o painel da academia. */
export async function publishCheckIn(id: string, type: "check-in.created" | "check-in.updated") {
    const checkIn = await prisma.checkIn.findUnique({ where: { id }, include: CHECK_IN_INCLUDE });
    if (checkIn) await publishCheckInEvent(checkIn.gymId, { type, checkIn: serializeCheckIn(checkIn) });
}

/**
 * Marca como EXPIRED os pendentes com mais de 15 min (de uma academia, de um
 * aluno ou de todos) e avisa o painel. Roda na leitura e a cada minuto.
 */
export async function expireStaleCheckIns(where: { gymId?: string; studentId?: string } = {}): Promise<void> {
    const stale = await prisma.checkIn.findMany({
        where: { ...where, status: "PENDING", requestedAt: { lt: new Date(Date.now() - PENDING_TTL_MS) } },
        select: { id: true },
    });

    for (const { id } of stale) {
        // Só quem conseguir mudar o status avisa (evita aviso repetido entre instâncias).
        const { count } = await prisma.checkIn.updateMany({ where: { id, status: "PENDING" }, data: { status: "EXPIRED" } });
        if (count > 0) await publishCheckIn(id, "check-in.updated");
    }
}

/** Expira pendentes a cada minuto, para o painel ver a mudança sem ninguém consultar. */
export function startCheckInExpirySweeper(): void {
    setInterval(() => {
        expireStaleCheckIns().catch(() => {
            // Banco fora do ar: tenta de novo no próximo minuto.
        });
    }, 60 * 1000).unref();
}

/** Último check-in do aluno hoje (fuso do app), já com os pendentes vencidos expirados. */
export async function todayCheckIn(studentId: string) {
    await expireStaleCheckIns({ studentId });
    const { start, end } = todayRange();

    return prisma.checkIn.findFirst({
        where: { studentId, requestedAt: { gte: start, lt: end } },
        orderBy: { requestedAt: "desc" },
        include: CHECK_IN_INCLUDE,
    });
}

/** O aluno já concluiu um treino hoje (fuso do app)? */
export async function hasTrainedToday(userId: string): Promise<boolean> {
    const { start, end } = todayRange();
    const count = await prisma.workoutSession.count({ where: { userId, completedAt: { gte: start, lt: end } } });
    return count > 0;
}

/** Cancela os pedidos pendentes do aluno (ex.: inativado ou matrícula cancelada). */
export async function cancelPendingCheckIns(studentId: string): Promise<void> {
    const pending = await prisma.checkIn.findMany({ where: { studentId, status: "PENDING" }, select: { id: true } });

    for (const { id } of pending) {
        const { count } = await prisma.checkIn.updateMany({
            where: { id, status: "PENDING" },
            data: { status: "CANCELLED", decidedAt: new Date() },
        });
        if (count > 0) await publishCheckIn(id, "check-in.updated");
    }
}
