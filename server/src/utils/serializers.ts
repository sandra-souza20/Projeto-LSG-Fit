import type { Equipment, GymMemberRole, UserRole } from "../../prisma/client/enums.js";
import { GYM_ADDRESS_SELECT, serializeGymAddress } from "./gym-address.js";

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
    gym: { select: { id: true, name: true, phone: true, ...GYM_ADDRESS_SELECT } },
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
    gym: GymRecord | null;
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
        gym: user.gym ? serializeGymSummary(user.gym) : null,
        gymEnrolledAt: isStudent ? user.gymEnrolledAt : null,
        specialty: isStudent ? null : user.specialty,
        bio: isStudent ? null : user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export type SerializedUser = ReturnType<typeof serializeUser>;

type GymRecord = {
    id: string;
    name: string;
    phone: string | null;
    addressZipCode: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressDistrict: string | null;
    addressCity: string | null;
    addressState: string | null;
};

/** Academia resumida: aparece em `user.gym` e em `GET /gyms` (público). */
export function serializeGymSummary(gym: GymRecord) {
    return {
        id: gym.id,
        name: gym.name,
        phone: gym.phone,
        address: serializeGymAddress(gym),
    };
}

/** Academia completa (app web), com os equipamentos que ela tem. */
export function serializeGym(gym: GymRecord & { equipment: Equipment[]; createdAt: Date; updatedAt: Date }) {
    return {
        ...serializeGymSummary(gym),
        equipment: gym.equipment,
        createdAt: gym.createdAt,
        updatedAt: gym.updatedAt,
    };
}

export type SerializedGym = ReturnType<typeof serializeGym>;

export const GYM_MEMBER_SELECT = {
    id: true,
    gymId: true,
    name: true,
    email: true,
    role: true,
    password: true,
    createdAt: true,
} as const;

/** Membro da academia. A senha só é lida para saber se já ativou; nunca sai. */
export function serializeGymMember(member: {
    id: string;
    gymId: string;
    name: string;
    email: string;
    role: GymMemberRole;
    password: string | null;
    createdAt: Date;
}) {
    return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        activated: member.password !== null,
        createdAt: member.createdAt,
    };
}

export type SerializedGymMember = ReturnType<typeof serializeGymMember>;
