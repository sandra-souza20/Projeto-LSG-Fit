import type { UserRole } from "../../prisma/client/enums.js";

// Formatos publicos das contas (docs/contrato-api.md, secoes 4 e 5).
// Nunca devolvem senha nem dados internos.

export const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    phone: true,
    professionalId: true,
    gymId: true,
    gymEnrolledAt: true,
    specialty: true,
    bio: true,
    gym: { select: { id: true, name: true } },
    createdAt: true,
    updatedAt: true,
} as const;

type UserRecord = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phone: string | null;
    professionalId: string | null;
    gymId: string | null;
    gymEnrolledAt: Date | null;
    specialty: string | null;
    bio: string | null;
    gym: { id: string; name: string } | null;
    createdAt: Date;
    updatedAt: Date;
};

export function serializeUser(user: UserRecord) {
    const isStudent = user.role === "STUDENT";

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        // Campos que so fazem sentido para um dos papeis vao como null no outro.
        professionalId: isStudent ? user.professionalId : null,
        gymId: user.gymId,
        gym: user.gym ? { id: user.gym.id, name: user.gym.name } : null,
        gymEnrolledAt: isStudent ? user.gymEnrolledAt : null,
        specialty: isStudent ? null : user.specialty,
        bio: isStudent ? null : user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export type SerializedUser = ReturnType<typeof serializeUser>;

export function serializeGym(gym: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        id: gym.id,
        name: gym.name,
        email: gym.email,
        phone: gym.phone,
        address: gym.address,
        createdAt: gym.createdAt,
        updatedAt: gym.updatedAt,
    };
}

export type SerializedGym = ReturnType<typeof serializeGym>;
