import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    professionalId: string;
    name: string;
    muscleGroup: string;
    equipment: string;
    instructions?: string | null;
    videoUrl?: string | null;
    gifUrl?: string | null;
};

function normalizeUrl(value: string | null | undefined, label: string) {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
        throw new AppError(`Informe um link de ${label} válido (começando com http:// ou https://).`);
    }

    return trimmed;
}

// RF08: cadastro previo de exercicios na biblioteca, com nome, descricao
// em texto e links de video/GIF demonstrativos.
export class CreateExerciseService {
    async execute(dto: IRequestDto) {
        const name = dto.name?.trim();
        const muscleGroup = dto.muscleGroup?.trim();
        const equipment = dto.equipment?.trim();

        if (!name) {
            throw new AppError("Informe o nome do exercício.");
        }

        if (!muscleGroup) {
            throw new AppError("Informe o grupo muscular.");
        }

        if (!equipment) {
            throw new AppError("Informe o equipamento.");
        }

        const duplicated = await prisma.exercise.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
        });

        if (duplicated) {
            throw new AppError("Já existe um exercício com esse nome na biblioteca.");
        }

        return prisma.exercise.create({
            data: {
                name,
                muscleGroup,
                equipment,
                instructions: dto.instructions?.trim() || null,
                videoUrl: normalizeUrl(dto.videoUrl, "vídeo"),
                gifUrl: normalizeUrl(dto.gifUrl, "GIF"),
                createdByProfessionalId: dto.professionalId,
            },
        });
    }
}
