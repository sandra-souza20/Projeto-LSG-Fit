import type { Response } from "express";

export class AppError extends Error {
    status: number;
    code?: string | undefined;

    constructor(message: string, status = 400, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

export function handleError(error: unknown, res: Response): Response {
    if (error instanceof AppError) {
        return res.status(error.status).json({ message: error.message, code: error.code });
    }

    console.error(error);
    return res.status(500).json({ message: "Erro inesperado. Tente novamente." });
}
