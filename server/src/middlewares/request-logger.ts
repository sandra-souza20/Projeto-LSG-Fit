import type { NextFunction, Request, Response } from "express";

// Uma linha por requisição, escrita quando a resposta termina:
//   2026-11-05T10:00:00.000Z POST /sessions 200 35ms 192.168.1.20 STUDENT
// Só o caminho, sem a query string. Corpo e headers (senhas, tokens, cookies)
// nunca entram no log.
// REQUEST_LOG=off desliga. Os GIFs de /media ficam de fora (são muitos).

const enabled = process.env["REQUEST_LOG"]?.trim().toLowerCase() !== "off";
const color = process.stdout.isTTY;

function paint(status: number, text: string): string {
    if (!color) return text;
    const code = status >= 500 ? 31 : status >= 400 ? 33 : status >= 300 ? 36 : 32;
    return `\x1b[${code}m${text}\x1b[0m`;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    if (!enabled || req.path.startsWith("/media")) {
        next();
        return;
    }

    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        const path = req.originalUrl.split("?")[0];
        const role = req.userRole ?? "-";
        console.log(
            `${new Date().toISOString()} ${req.method} ${path} ${paint(res.statusCode, String(res.statusCode))} ${ms.toFixed(0)}ms ${req.ip ?? "-"} ${role}`,
        );
    });

    next();
}
