import type { Request, Response } from "express";
import { CreateGymService } from "../services/create-gym.service.js";
import { AuthenticateGymService } from "../services/authenticate-gym.service.js";
import { handleError } from "../utils/app-error.js";
import { prisma } from "../database/prisma.js";

export class GymsController {
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const createGym = new CreateGymService();

            const result = await createGym.execute(req.body);

            return res.status(201).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async login(req: Request, res: Response): Promise<Response> {
        try {
            const authenticateGym = new AuthenticateGymService();

            const result = await authenticateGym.execute(req.body);

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async me(req: Request, res: Response): Promise<Response> {
        const gym = await prisma.gym.findUniqueOrThrow({ where: { id: req.userId } });

        return res.status(200).json({
            id: gym.id,
            name: gym.name,
            email: gym.email,
            createdAt: gym.createdAt,
            updatedAt: gym.updatedAt,
        });
    }

    async listAll(req: Request, res: Response): Promise<Response> {
        const gyms = await prisma.gym.findMany({
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(gyms);
    }
}
