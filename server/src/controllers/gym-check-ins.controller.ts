import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import type { CheckInStatus } from "../../prisma/client/enums.js";
import {
    CHECK_IN_INCLUDE,
    expireStaleCheckIns,
    PENDING_TTL_MS,
    publishCheckIn,
    serializeCheckIn,
} from "../services/check-ins.service.js";
import { AppError, handleError } from "../utils/app-error.js";
import { dayKey, dayRange } from "../utils/app-day.js";
import { subscribeCheckInEvents } from "../utils/check-in-events.js";
import { redis } from "../utils/redis.js";
import { sessionKeys } from "../utils/session.js";

const STATUSES: CheckInStatus[] = ["PENDING", "APPROVED", "DENIED", "EXPIRED", "CANCELLED"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEARTBEAT_MS = 25 * 1000;

/** Decide um pedido pendente desta academia (aprovar ou negar). */
async function decide(req: Request, status: "APPROVED" | "DENIED", denialReason: string | null) {
    const id = req.params.checkInId as string;

    if (!UUID_PATTERN.test(id)) {
        throw new AppError("Check-in não encontrado.", 404);
    }

    await expireStaleCheckIns({ gymId: req.gymId });

    // So muda se ainda estiver pendente (outro membro pode ter decidido antes).
    const { count } = await prisma.checkIn.updateMany({
        where: {
            id,
            gymId: req.gymId,
            status: "PENDING",
            requestedAt: { gte: new Date(Date.now() - PENDING_TTL_MS) },
        },
        data: { status, decidedAt: new Date(), decidedById: req.userId, denialReason },
    });

    const checkIn = await prisma.checkIn.findFirst({ where: { id, gymId: req.gymId }, include: CHECK_IN_INCLUDE });

    if (!checkIn) {
        throw new AppError("Check-in não encontrado.", 404);
    }

    if (count === 0) {
        const messages: Record<string, string> = {
            EXPIRED: "Esse check-in expirou: o aluno precisa pedir de novo.",
            CANCELLED: "O aluno cancelou esse check-in.",
        };
        throw new AppError(
            messages[checkIn.status] ?? "Esse check-in já foi respondido.",
            409,
            checkIn.status === "EXPIRED" ? "CHECK_IN_EXPIRED" : "CHECK_IN_ALREADY_DECIDED",
        );
    }

    await publishCheckIn(id, "check-in.updated");
    return serializeCheckIn(checkIn);
}

// Check-ins da academia (painel web): fila em tempo real, aprovar e negar.
export class GymCheckInsController {
    // ?status=PENDING para a fila; ?date=aaaa-mm-dd (padrao: hoje, fuso do app).
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
            const date = typeof req.query.date === "string" ? req.query.date : dayKey(new Date());

            if (status && !STATUSES.includes(status as CheckInStatus)) {
                throw new AppError("Status inválido.");
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                throw new AppError("Informe a data no formato aaaa-mm-dd.");
            }

            await expireStaleCheckIns({ gymId: req.gymId });
            const { start, end } = dayRange(date);

            const checkIns = await prisma.checkIn.findMany({
                where: {
                    gymId: req.gymId,
                    requestedAt: { gte: start, lt: end },
                    ...(status ? { status: status as CheckInStatus } : {}),
                },
                include: CHECK_IN_INCLUDE,
                orderBy: { requestedAt: "desc" },
            });

            return res.status(200).json(checkIns.map(serializeCheckIn));
        } catch (error) {
            return handleError(error, res);
        }
    }

    async approve(req: Request, res: Response): Promise<Response> {
        try {
            return res.status(200).json(await decide(req, "APPROVED", null));
        } catch (error) {
            return handleError(error, res);
        }
    }

    async deny(req: Request, res: Response): Promise<Response> {
        try {
            const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
            return res.status(200).json(await decide(req, "DENIED", reason || null));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // SSE: eventos "check-in.created" e "check-in.updated" desta academia.
    // A conexao fecha se a sessao do membro for encerrada.
    stream(req: Request, res: Response): void {
        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        // Proxies (ex.: nginx) nao seguram os eventos em buffer.
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        // Reconexao automatica do EventSource em 5 s.
        res.write("retry: 5000\n");
        res.write(`event: ready\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);

        const unsubscribe = subscribeCheckInEvents(req.gymId, (event) => {
            res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.checkIn)}\n\n`);
        });

        const heartbeat = setInterval(async () => {
            try {
                const alive = await redis.exists(sessionKeys.session(req.sessionId));
                if (!alive) {
                    res.write(`event: session-expired\ndata: {}\n\n`);
                    res.end();
                    return;
                }
            } catch {
                // Redis fora do ar: mantem a conexao.
            }
            res.write(": ping\n\n");
        }, HEARTBEAT_MS);

        req.on("close", () => {
            clearInterval(heartbeat);
            unsubscribe();
        });
    }
}
