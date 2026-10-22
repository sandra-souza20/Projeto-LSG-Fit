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

    // Profissionais vinculados a esta academia (relacao "Contrata" do DER),
    // incluindo os pedidos pendentes de aprovacao.
    async professionals(req: Request, res: Response): Promise<Response> {
        const professionals = await prisma.professional.findMany({
            where: { gymId: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                specialty: true,
                gymStatus: true,
                _count: { select: { students: true } },
            },
            orderBy: [{ gymStatus: "asc" }, { name: "asc" }],
        });

        return res.status(200).json(
            professionals.map(({ _count, ...professional }) => ({
                ...professional,
                studentsCount: _count.students,
            })),
        );
    }

    // A academia aprova o pedido de vinculo de um profissional.
    async approveProfessional(req: Request, res: Response): Promise<Response> {
        try {
            const { count } = await prisma.professional.updateMany({
                where: { id: req.params.professionalId as string, gymId: req.userId, gymStatus: "PENDING" },
                data: { gymStatus: "ACTIVE" },
            });

            if (count === 0) {
                throw new AppError("Pedido de vínculo não encontrado.", 404);
            }

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Recusa um pedido pendente ou remove um profissional ja aprovado. Os alunos
    // dele nao mudam: o personal pode continuar atendendo como autonomo.
    async removeProfessional(req: Request, res: Response): Promise<Response> {
        try {
            const { count } = await prisma.professional.updateMany({
                where: { id: req.params.professionalId as string, gymId: req.userId },
                data: { gymId: null, gymStatus: null },
            });

            if (count === 0) {
                throw new AppError("Profissional não encontrado nesta academia.", 404);
            }

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Relacao "Matricula" do DER: alunos que treinam nesta academia.
    // RNF05: a academia ve so dados de contato e vinculo, nunca a ficha de
    // treino nem as avaliacoes fisicas do aluno.
    async students(req: Request, res: Response): Promise<Response> {
        const students = await prisma.user.findMany({
            where: { gymId: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                gymEnrolledAt: true,
                professional: { select: { id: true, name: true } },
            },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(students);
    }

    // A academia cancela a matricula de um aluno que saiu. O vinculo com o
    // profissional nao muda: o personal pode continuar atendendo o aluno.
    async removeStudent(req: Request, res: Response): Promise<Response> {
        try {
            const { count } = await prisma.user.updateMany({
                where: { id: req.params.studentId as string, gymId: req.userId },
                data: { gymId: null, gymEnrolledAt: null },
            });

            if (count === 0) {
                throw new AppError("Aluno não encontrado nesta academia.", 404);
            }

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }
}
