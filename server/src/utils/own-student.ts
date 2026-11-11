import { prisma } from "../database/prisma.js";
import { AppError } from "./app-error.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aluno orientado por este profissional. 404 se nao for (ou se o id nao for UUID). */
export async function ensureOwnStudent(professionalId: string, studentId: string) {
    const student = UUID_PATTERN.test(studentId)
        ? await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, professionalId: true } })
        : null;

    if (!student || student.professionalId !== professionalId) {
        throw new AppError("Aluno não encontrado.", 404);
    }

    return student;
}
