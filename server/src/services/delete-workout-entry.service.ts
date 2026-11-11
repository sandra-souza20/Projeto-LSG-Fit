import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type IRequestDto = {
    id: string;
    userId: string;
};

export class DeleteWorkoutEntryService {
    async execute(dto: IRequestDto) {
        // Id que nao e UUID: o Postgres recusaria a consulta (erro 500).
        const entry = UUID_PATTERN.test(dto.id) ? await prisma.workoutEntry.findUnique({ where: { id: dto.id } }) : null;

        if (!entry || entry.userId !== dto.userId) {
            throw new AppError("Exercício do treino não encontrado.", 404);
        }

        await prisma.workoutEntry.delete({ where: { id: dto.id } });
    }
}
