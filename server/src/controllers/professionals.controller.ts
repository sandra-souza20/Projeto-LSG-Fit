import type { Request, Response } from "express";
import { CreateProfessionalService } from "../services/create-professional.service.js";
import { AuthenticateProfessionalService } from "../services/authenticate-professional.service.js";
import { handleError } from "../utils/app-error.js";
import { prisma } from "../database/prisma.js";

export class ProfessionalsController {
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const createProfessional = new CreateProfessionalService();

            const result = await createProfessional.execute(req.body);

            return res.status(201).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async login(req: Request, res: Response): Promise<Response> {
        try {
            const authenticateProfessional = new AuthenticateProfessionalService();

            const result = await authenticateProfessional.execute(req.body);

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async me(req: Request, res: Response): Promise<Response> {
        const professional = await prisma.professional.findUniqueOrThrow({ where: { id: req.userId } });

        return res.status(200).json({
            id: professional.id,
            name: professional.name,
            email: professional.email,
            gymId: professional.gymId,
            createdAt: professional.createdAt,
            updatedAt: professional.updatedAt,
        });
    }

    async listAll(req: Request, res: Response): Promise<Response> {
        const professionals = await prisma.professional.findMany({
            select: { id: true, name: true, email: true, gymId: true },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(professionals);
    }

    async students(req: Request, res: Response): Promise<Response> {
        const students = await prisma.user.findMany({
            where: { professionalId: req.userId },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(students);
    }
}
