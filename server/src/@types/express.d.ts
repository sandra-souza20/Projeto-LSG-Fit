import type { ActorRole, SessionTransport } from "../utils/session.js";

declare global {
    namespace Express {
        interface Request {
            // Id da conta logada: users.id (aluno e profissional) ou
            // gym_members.id (membro da academia).
            userId: string;
            userRole: ActorRole;
            // Só no papel GYM: academia do membro logado (gyms.id).
            gymId: string;
            sessionId: string;
            sessionTransport: SessionTransport;
        }
    }
}

export {};
