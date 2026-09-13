import { prisma } from "../database/prisma.js";

export class ListPhysicalAssessmentsService {
    async execute(userId: string) {
        return prisma.physicalAssessment.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
}
