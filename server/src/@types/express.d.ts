import type { ActorRole, SessionTransport } from "../utils/session.js";

declare global {
    namespace Express {
        interface Request {
            // Id da conta logada (users.id ou gyms.id, conforme o papel).
            userId: string;
            userRole: ActorRole;
            sessionId: string;
            sessionTransport: SessionTransport;
        }
    }
}

export {};
