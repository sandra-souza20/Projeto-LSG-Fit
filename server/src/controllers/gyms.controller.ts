import type { Request, Response } from "express";
import { CreateGymService } from "../services/create-gym.service.js";
import { AuthenticateGymService } from "../services/authenticate-gym.service.js";
import { AppError, handleError } from "../utils/app-error.js";
import { prisma } from "../database/prisma.js";

function serializeGym(gym: {
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

        return res.status(200).json(serializeGym(gym));
    }

    async updateMe(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phone, address } = req.body as {
                name?: string;
                phone?: string | null;
                address?: string | null;
            };

            if (name !== undefined && !name.trim()) {
                throw new AppError("Informe o nome da academia.");
            }

            const gym = await prisma.gym.update({
                where: { id: req.userId },
                data: {
                    ...(name !== undefined ? { name: name.trim() } : {}),
                    ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
                    ...(address !== undefined ? { address: address?.trim() || null } : {}),
                },
            });

            return res.status(200).json(serializeGym(gym));
        } catch (error) {
            return handleError(error, res);
        }
    }

    async listAll(req: Request, res: Response): Promise<Response> {
        const gyms = await prisma.gym.findMany({
            select: { id: true, name: true, email: true, phone: true, address: true },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(gyms);
    }

    // Profissionais que se vincularam a esta academia (relacao "Contrata" do DER).
    async professionals(req: Request, res: Response): Promise<Response> {
        const professionals = await prisma.professional.findMany({
            where: { gymId: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                specialty: true,
                _count: { select: { students: true } },
            },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(
            professionals.map(({ _count, ...professional }) => ({
                ...professional,
                studentsCount: _count.students,
            })),
        );
    }
}
