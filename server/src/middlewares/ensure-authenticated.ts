import type { NextFunction, Request, Response } from "express";
import { verifyToken, type ActorRole } from "../utils/jwt.js";

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ message: "Missing authorization token" });
        return;
    }

    const [, token] = authHeader.split(" ");

    if (!token) {
        res.status(401).json({ message: "Invalid authorization token" });
        return;
    }

    try {
        const { id, role } = verifyToken(token);
        req.userId = id;
        req.userRole = role;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}

// Usar depois de ensureAuthenticated, para restringir uma rota a determinados papeis.
export function restrictTo(...allowedRoles: ActorRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!allowedRoles.includes(req.userRole)) {
            res.status(403).json({ message: "Access denied for this actor type" });
            return;
        }

        next();
    };
}
