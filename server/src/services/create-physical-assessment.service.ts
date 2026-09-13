import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

type IRequestDto = {
    userId: string;
    recordedByProfessionalId?: string | null;
    weight: number;
    height?: number | null;
    chest?: number | null;
    waist?: number | null;
    hip?: number | null;
    arm?: number | null;
    thigh?: number | null;
    notes?: string | null;
};

const OPTIONAL_MEASUREMENTS = ["height", "chest", "waist", "hip", "arm", "thigh"] as const;

export class CreatePhysicalAssessmentService {
    async execute(dto: IRequestDto) {
        if (!dto.weight || dto.weight <= 0) {
            throw new AppError("Informe um peso válido.");
        }

        for (const field of OPTIONAL_MEASUREMENTS) {
            const value = dto[field];
            if (value !== undefined && value !== null && value <= 0) {
                throw new AppError("As medidas informadas devem ser maiores que zero.");
            }
        }

        return prisma.physicalAssessment.create({
            data: {
                userId: dto.userId,
                recordedByProfessionalId: dto.recordedByProfessionalId ?? null,
                weight: dto.weight,
                height: dto.height ?? null,
                chest: dto.chest ?? null,
                waist: dto.waist ?? null,
                hip: dto.hip ?? null,
                arm: dto.arm ?? null,
                thigh: dto.thigh ?? null,
                notes: dto.notes ?? null,
            },
        });
    }
}
