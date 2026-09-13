import type { ActorRole } from "../utils/jwt.js";

declare global {
    namespace Express {
        interface Request {
            userId: string;
            userRole: ActorRole;
        }
    }
}

export {};
