import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "../database/prisma.js";
import type { AuthCodePurpose } from "../../prisma/client/enums.js";
import { AppError } from "./app-error.js";

// Codigos de 6 digitos enviados por e-mail (docs/contrato-api.md, secao 7).
// No banco fica so o sha256; cada dono tem no maximo um codigo ativo por
// finalidade, com no maximo 5 tentativas e uso unico.

export type AuthCodeOwner = { userId: string } | { gymId: string };

const TTL_MINUTES: Record<AuthCodePurpose, number> = {
    EMAIL_VERIFICATION: 15,
    PASSWORD_RESET: 15,
    PROFESSIONAL_INVITE: 72 * 60,
};

const MAX_ATTEMPTS = 5;

export const INVALID_CODE_MESSAGE = "Código inválido ou expirado.";

function hashCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
}

function ownerWhere(owner: AuthCodeOwner) {
    return "userId" in owner ? { userId: owner.userId } : { gymId: owner.gymId };
}

/** Gera um codigo novo para o dono e a finalidade, apagando o anterior. Devolve o codigo em texto. */
export async function issueAuthCode(owner: AuthCodeOwner, purpose: AuthCodePurpose): Promise<string> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const where = ownerWhere(owner);

    await prisma.$transaction([
        prisma.authCode.deleteMany({ where: { ...where, purpose } }),
        prisma.authCode.create({
            data: {
                ...where,
                purpose,
                codeHash: hashCode(code),
                expiresAt: new Date(Date.now() + TTL_MINUTES[purpose] * 60 * 1000),
            },
        }),
    ]);

    return code;
}

/**
 * Confere o codigo e, se estiver certo, apaga (uso unico). Se estiver errado,
 * conta a tentativa e apaga o codigo na quinta. Em qualquer falha lanca 400
 * "Código inválido ou expirado.".
 */
export async function consumeAuthCode(owner: AuthCodeOwner, purpose: AuthCodePurpose, code: unknown): Promise<void> {
    const authCode = await prisma.authCode.findFirst({
        where: { ...ownerWhere(owner), purpose },
        orderBy: { createdAt: "desc" },
    });

    if (!authCode) {
        throw new AppError(INVALID_CODE_MESSAGE);
    }

    if (authCode.expiresAt < new Date()) {
        await prisma.authCode.deleteMany({ where: { id: authCode.id } });
        throw new AppError(INVALID_CODE_MESSAGE);
    }

    const informed = Buffer.from(hashCode(String(code ?? "").trim()));
    const expected = Buffer.from(authCode.codeHash);

    if (informed.length !== expected.length || !timingSafeEqual(informed, expected)) {
        // updateMany/deleteMany nao falham se o codigo ja tiver sido apagado
        // por outra requisicao em paralelo.
        await prisma.authCode.updateMany({
            where: { id: authCode.id },
            data: { attempts: { increment: 1 } },
        });
        await prisma.authCode.deleteMany({ where: { id: authCode.id, attempts: { gte: MAX_ATTEMPTS } } });

        throw new AppError(INVALID_CODE_MESSAGE);
    }

    // Apaga condicionando ao hash: se duas requisicoes usarem o mesmo codigo
    // ao mesmo tempo, so uma consegue apagar e a outra recebe o erro.
    const { count } = await prisma.authCode.deleteMany({ where: { id: authCode.id, codeHash: authCode.codeHash } });

    if (count === 0) {
        throw new AppError(INVALID_CODE_MESSAGE);
    }
}
