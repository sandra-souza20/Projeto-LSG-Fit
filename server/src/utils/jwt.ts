import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export type ActorRole = "STUDENT" | "PROFESSIONAL" | "GYM";

export function signToken(id: string, role: ActorRole): string {
    return jwt.sign({ role }, JWT_SECRET, { subject: id });
}

export function verifyToken(token: string): { id: string; role: ActorRole } {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { role?: ActorRole };

    // Tokens emitidos antes da introducao de papeis nao tem "role" no payload;
    // trata-los como STUDENT mantem sessoes ja logadas validas.
    return { id: payload.sub!, role: payload.role ?? "STUDENT" };
}
