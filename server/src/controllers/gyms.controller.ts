import type { Request, Response } from "express";
import { CreateGymService } from "../services/create-gym.service.js";
import { AuthenticateGymService } from "../services/authenticate-gym.service.js";
import { RequestGymPasswordResetService } from "../services/request-gym-password-reset.service.js";
import { ResetGymPasswordService } from "../services/reset-gym-password.service.js";
import {
    CreateGymProfessionalService,
    GYM_PROFESSIONAL_SELECT,
    serializeGymProfessional,
} from "../services/create-gym-professional.service.js";
import { SendProfessionalInviteService } from "../services/send-professional-invite.service.js";
import { SendGymMemberInviteService } from "../services/send-gym-member-invite.service.js";
import {
    ActivateGymMemberService,
    GetGymMemberInviteService,
    InviteGymMemberService,
} from "../services/gym-members.service.js";
import { addressToColumns, GYM_ADDRESS_SELECT } from "../utils/gym-address.js";
import { ALWAYS_AVAILABLE, parseEquipmentList } from "../utils/equipment.js";
import { AppError, handleError } from "../utils/app-error.js";
import { startGymSession } from "../utils/account-session.js";
import { GYM_MEMBER_SELECT, serializeGym, serializeGymMember, serializeGymSummary } from "../utils/serializers.js";
import { revokeAllSessions } from "../utils/session.js";
import { prisma } from "../database/prisma.js";
import { cancelPendingCheckIns } from "../services/check-ins.service.js";
import { isValidEmail, normalizeEmail } from "../utils/account-email.js";
import { emailVerificationEnabled } from "../utils/email-verification.js";
import { listSessionsInRange, parseRange } from "./workout-sessions.controller.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Troca os campos internos da matricula por status, motivo e data da inativacao. */
function withEnrollmentStatus<T extends { gymInactivatedAt: Date | null; gymInactiveReason: string | null }>(student: T) {
    const { gymInactivatedAt, gymInactiveReason, ...rest } = student;
    return {
        ...rest,
        status: gymInactivatedAt ? ("INACTIVE" as const) : ("ACTIVE" as const),
        inactiveReason: gymInactiveReason,
        inactivatedAt: gymInactivatedAt,
    };
}

/** Membro desta academia. 404 se nao existir, for de outra academia ou o id nao for UUID. */
async function findGymMember(gymId: string, memberId: string) {
    if (!UUID_PATTERN.test(memberId)) {
        throw new AppError("Membro não encontrado nesta academia.", 404);
    }

    const member = await prisma.gymMember.findFirst({
        where: { id: memberId, gymId },
        select: { id: true, role: true },
    });

    if (!member) {
        throw new AppError("Membro não encontrado nesta academia.", 404);
    }

    return member;
}

/** Aluno matriculado nesta academia. 404 se nao existir, for de outra academia ou o id nao for UUID. */
async function findGymStudent(gymId: string, studentId: string) {
    if (!UUID_PATTERN.test(studentId)) {
        throw new AppError("Aluno não encontrado nesta academia.", 404);
    }

    const student = await prisma.user.findFirst({
        where: { id: studentId, gymId, role: "STUDENT" },
        select: { id: true },
    });

    if (!student) {
        throw new AppError("Aluno não encontrado nesta academia.", 404);
    }

    return student;
}

async function findGymProfessional(gymId: string, professionalId: string) {
    // Id que nao e UUID: o Postgres recusaria a consulta (erro 500).
    if (!UUID_PATTERN.test(professionalId)) {
        throw new AppError("Profissional não encontrado nesta academia.", 404);
    }

    const professional = await prisma.user.findFirst({
        where: { id: professionalId, gymId, role: "PROFESSIONAL" },
        select: { id: true },
    });

    if (!professional) {
        throw new AppError("Profissional não encontrado nesta academia.", 404);
    }

    return professional;
}

export class GymsController {
    // Cadastro livre: cria a academia e o dono, que ja entra (sem "lembrar").
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const { member, gym, session } = await new CreateGymService().execute(req.body ?? {});
            const { csrfToken } = await startGymSession(req, res, session, { remember: false });

            return res.status(201).json({ member, gym, csrfToken });
        } catch (error) {
            return handleError(error, res);
        }
    }

    async login(req: Request, res: Response): Promise<Response> {
        try {
            const { member, gym, session } = await new AuthenticateGymService().execute(req.body ?? {});
            const { csrfToken } = await startGymSession(req, res, session, { remember: req.body?.rememberDevice === true });

            return res.status(200).json({ member, gym, csrfToken });
        } catch (error) {
            return handleError(error, res);
        }
    }

    async forgotPassword(req: Request, res: Response): Promise<Response> {
        try {
            const result = await new RequestGymPasswordResetService().execute(req.body ?? {});

            return res.status(200).json(result);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Redefinir a senha derruba as outras sessoes do membro (secao 2.5).
    async resetPassword(req: Request, res: Response): Promise<Response> {
        try {
            const { member, gym, session } = await new ResetGymPasswordService().execute(req.body ?? {});
            const { csrfToken } = await startGymSession(req, res, session, { remember: false, revokeOthers: true });

            return res.status(200).json({ member, gym, csrfToken });
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Pagina "aceitar convite" do app web: para quem e o convite.
    async memberInvite(req: Request, res: Response): Promise<Response> {
        try {
            const invite = await new GetGymMemberInviteService().execute(req.body ?? {});

            return res.status(200).json(invite);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Cria a senha do membro convidado e ja entra (sem "lembrar").
    async activateMember(req: Request, res: Response): Promise<Response> {
        try {
            const { member, gym, session } = await new ActivateGymMemberService().execute(req.body ?? {});
            const { csrfToken } = await startGymSession(req, res, session, { remember: false, revokeOthers: true });

            return res.status(200).json({ member, gym, csrfToken });
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Academia do membro logado.
    async me(req: Request, res: Response): Promise<Response> {
        try {
            const gym = await prisma.gym.findUnique({ where: { id: req.gymId } });

            if (!gym) {
                throw new AppError("Academia não encontrada.", 404);
            }

            return res.status(200).json(serializeGym(gym));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Qualquer membro edita os dados da academia.
    async updateMe(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phone, address, equipment } = (req.body ?? {}) as {
                name?: string;
                phone?: string | null;
                address?: unknown;
                // Lista completa dos equipamentos que a academia tem (substitui a atual).
                equipment?: unknown;
            };

            if (name !== undefined && !name.trim()) {
                throw new AppError("Informe o nome da academia.");
            }

            const gym = await prisma.gym.update({
                where: { id: req.gymId },
                data: {
                    ...(name !== undefined ? { name: name.trim() } : {}),
                    ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
                    ...addressToColumns(address),
                    ...(equipment !== undefined
                        ? { equipment: parseEquipmentList(equipment, { allowEmpty: true }).filter((key) => key !== ALWAYS_AVAILABLE) }
                        : {}),
                },
            });

            return res.status(200).json(serializeGym(gym));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Lista publica (cadastro do aluno no mobile).
    async listAll(req: Request, res: Response): Promise<Response> {
        try {
            const gyms = await prisma.gym.findMany({
                select: { id: true, name: true, phone: true, ...GYM_ADDRESS_SELECT },
                orderBy: { name: "asc" },
            });

            return res.status(200).json(gyms.map(serializeGymSummary));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Membro logado (a pessoa, nao a academia).
    async account(req: Request, res: Response): Promise<Response> {
        try {
            const member = await prisma.gymMember.findUnique({ where: { id: req.userId }, select: GYM_MEMBER_SELECT });

            if (!member) {
                throw new AppError("Conta não encontrada.", 404);
            }

            return res.status(200).json(serializeGymMember(member));
        } catch (error) {
            return handleError(error, res);
        }
    }

    async updateAccount(req: Request, res: Response): Promise<Response> {
        try {
            const { name } = (req.body ?? {}) as { name?: string };

            if (!name?.trim()) {
                throw new AppError("Informe o seu nome.");
            }

            const member = await prisma.gymMember.update({
                where: { id: req.userId },
                data: { name: name.trim() },
                select: GYM_MEMBER_SELECT,
            });

            return res.status(200).json(serializeGymMember(member));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Membros da academia: todos veem; so o dono convida e remove.
    async members(req: Request, res: Response): Promise<Response> {
        try {
            const members = await prisma.gymMember.findMany({
                where: { gymId: req.gymId },
                select: GYM_MEMBER_SELECT,
                orderBy: [{ role: "asc" }, { name: "asc" }],
            });

            return res.status(200).json(members.map(serializeGymMember));
        } catch (error) {
            return handleError(error, res);
        }
    }

    async inviteMember(req: Request, res: Response): Promise<Response> {
        try {
            const member = await new InviteGymMemberService().execute({ ...(req.body ?? {}), gymId: req.gymId });

            return res.status(201).json(member);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async resendMemberInvite(req: Request, res: Response): Promise<Response> {
        try {
            const member = await findGymMember(req.gymId, req.params.memberId as string);

            await new SendGymMemberInviteService().execute(member.id);

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    // O dono nao pode ser removido (nem remover a si mesmo). As sessoes do
    // membro removido sao derrubadas.
    async removeMember(req: Request, res: Response): Promise<Response> {
        try {
            const member = await findGymMember(req.gymId, req.params.memberId as string);

            if (member.role === "OWNER") {
                throw new AppError("O dono da academia não pode ser removido.");
            }

            await prisma.gymMember.delete({ where: { id: member.id } });
            await revokeAllSessions("gym", member.id);

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Profissionais contratados por esta academia (relacao "Contrata" do DER),
    // incluindo os que ainda nao ativaram a conta.
    async professionals(req: Request, res: Response): Promise<Response> {
        try {
            const professionals = await prisma.user.findMany({
                where: { gymId: req.gymId, role: "PROFESSIONAL" },
                select: GYM_PROFESSIONAL_SELECT,
                orderBy: { name: "asc" },
            });

            return res.status(200).json(professionals.map(serializeGymProfessional));
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Detalhes de um profissional da academia: GymProfessional + bio, validade
    // do convite (se ainda nao ativou) e os alunos que ele orienta.
    async professionalDetails(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = await findGymProfessional(req.gymId, req.params.professionalId as string);

            const professional = await prisma.user.findUniqueOrThrow({
                where: { id },
                select: {
                    ...GYM_PROFESSIONAL_SELECT,
                    bio: true,
                    students: { select: { id: true, name: true }, orderBy: { name: "asc" } },
                    authCodes: {
                        where: { purpose: "PROFESSIONAL_INVITE" },
                        select: { expiresAt: true },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            });

            const activated = professional.password !== null;

            return res.status(200).json({
                ...serializeGymProfessional(professional),
                bio: professional.bio,
                inviteExpiresAt: activated ? null : (professional.authCodes[0]?.expiresAt ?? null),
                students: professional.students,
            });
        } catch (error) {
            return handleError(error, res);
        }
    }

    // So a academia cadastra profissionais; o profissional recebe um convite.
    async createProfessional(req: Request, res: Response): Promise<Response> {
        try {
            const createGymProfessional = new CreateGymProfessionalService();

            const professional = await createGymProfessional.execute({ ...(req.body ?? {}), gymId: req.gymId });

            return res.status(201).json(professional);
        } catch (error) {
            return handleError(error, res);
        }
    }

    async resendProfessionalInvite(req: Request, res: Response): Promise<Response> {
        try {
            const professional = await findGymProfessional(req.gymId, req.params.professionalId as string);

            await new SendProfessionalInviteService().execute(professional.id);

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Apaga a conta do profissional: os alunos dele ficam sem profissional
    // (onDelete SetNull) e as sessoes abertas dele sao derrubadas.
    async removeProfessional(req: Request, res: Response): Promise<Response> {
        try {
            const professional = await findGymProfessional(req.gymId, req.params.professionalId as string);

            await prisma.user.delete({ where: { id: professional.id } });
            await revokeAllSessions("user", professional.id);

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Relacao "Matricula" do DER: alunos que treinam nesta academia, com a
    // frequencia (caso de uso "Verificar Frequencia"). Com ?from=&to= conta os
    // treinos do periodo; lastWorkoutAt permite achar os alunos ausentes.
    // RNF05: a academia ve contato, vinculo e datas de treino, nunca a ficha
    // de treino nem as avaliacoes fisicas do aluno.
    async students(req: Request, res: Response): Promise<Response> {
        try {
            const range = req.query.from || req.query.to ? parseRange(req.query) : null;

            const students = await prisma.user.findMany({
                where: { gymId: req.gymId, role: "STUDENT" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    gymEnrolledAt: true,
                    gymInactivatedAt: true,
                    gymInactiveReason: true,
                    professional: { select: { id: true, name: true } },
                    workoutSessions: {
                        select: { completedAt: true },
                        orderBy: { completedAt: "desc" },
                        take: 1,
                    },
                    _count: {
                        select: {
                            workoutSessions: {
                                where: range ? { completedAt: { gte: range.from, lte: range.to } } : {},
                            },
                        },
                    },
                },
                orderBy: { name: "asc" },
            });

            return res.status(200).json(
                students.map(({ workoutSessions, _count, ...student }) => ({
                    ...withEnrollmentStatus(student),
                    lastWorkoutAt: workoutSessions[0]?.completedAt ?? null,
                    ...(range ? { workoutsInRange: _count.workoutSessions } : {}),
                })),
            );
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Detalhes de um aluno matriculado: os campos da listagem, mais o total de
    // treinos, os treinos dos ultimos 30 dias e os 10 mais recentes. RNF05:
    // nada da ficha de treino nem da avaliacao fisica.
    async studentDetails(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = await findGymStudent(req.gymId, req.params.studentId as string);
            const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const [student, totalWorkouts, workoutsLast30Days] = await Promise.all([
                prisma.user.findUniqueOrThrow({
                    where: { id },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        gymEnrolledAt: true,
                        gymInactivatedAt: true,
                        gymInactiveReason: true,
                        professional: { select: { id: true, name: true } },
                        workoutSessions: {
                            select: { id: true, dayOfWeek: true, completedAt: true },
                            orderBy: { completedAt: "desc" },
                            take: 10,
                        },
                    },
                }),
                prisma.workoutSession.count({ where: { userId: id } }),
                prisma.workoutSession.count({ where: { userId: id, completedAt: { gte: last30Days } } }),
            ]);

            const { workoutSessions, ...rest } = student;

            return res.status(200).json({
                ...withEnrollmentStatus(rest),
                lastWorkoutAt: workoutSessions[0]?.completedAt ?? null,
                totalWorkouts,
                workoutsLast30Days,
                recentWorkouts: workoutSessions,
            });
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Calendario de frequencia de um aluno matriculado nesta academia.
    async studentWorkoutSessions(req: Request, res: Response): Promise<Response> {
        try {
            const student = await findGymStudent(req.gymId, req.params.studentId as string);

            const sessions = await listSessionsInRange(student.id, req.query);

            return res.status(200).json(sessions);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Matricula feita pela academia, pelo e-mail que o aluno usou no app.
    // O aluno precisa ja ter conta (e confirmada) e nao estar em outra academia.
    async enrollStudent(req: Request, res: Response): Promise<Response> {
        try {
            const email = normalizeEmail((req.body ?? {}).email);

            if (!isValidEmail(email)) {
                throw new AppError("Informe um e-mail válido.");
            }

            const student = await prisma.user.findUnique({
                where: { email },
                select: { id: true, role: true, emailVerified: true, gymId: true },
            });

            // Cadastro ainda nao confirmado conta como inexistente.
            if (!student || (emailVerificationEnabled && !student.emailVerified)) {
                throw new AppError(
                    "Nenhum aluno cadastrado com esse e-mail. Peça para ele criar a conta no app LSG FIT.",
                    404,
                );
            }

            if (student.role !== "STUDENT") {
                throw new AppError("Esse e-mail é de um profissional, não de um aluno.");
            }

            if (student.gymId === req.gymId) {
                throw new AppError("Esse aluno já está matriculado na sua academia.", 409, "ALREADY_ENROLLED");
            }

            if (student.gymId) {
                throw new AppError(
                    "Esse aluno está matriculado em outra academia. A outra academia precisa cancelar a matrícula antes.",
                    409,
                    "ENROLLED_ELSEWHERE",
                );
            }

            // So matricula se ele continuar sem academia (outra academia pode ter
            // matriculado ao mesmo tempo).
            const { count } = await prisma.user.updateMany({
                where: { id: student.id, gymId: null },
                data: { gymId: req.gymId, gymEnrolledAt: new Date(), gymInactivatedAt: null, gymInactiveReason: null },
            });

            if (count === 0) {
                throw new AppError(
                    "Esse aluno está matriculado em outra academia. A outra academia precisa cancelar a matrícula antes.",
                    409,
                    "ENROLLED_ELSEWHERE",
                );
            }

            const enrolled = await prisma.user.findUniqueOrThrow({
                where: { id: student.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    gymEnrolledAt: true,
                    gymInactivatedAt: true,
                    gymInactiveReason: true,
                    professional: { select: { id: true, name: true } },
                    workoutSessions: { select: { completedAt: true }, orderBy: { completedAt: "desc" }, take: 1 },
                },
            });
            const { workoutSessions, ...rest } = enrolled;

            return res.status(201).json({ ...withEnrollmentStatus(rest), lastWorkoutAt: workoutSessions[0]?.completedAt ?? null });
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Inativa o aluno (ex.: mensalidade atrasada). Ele nao consegue fazer
    // check-in e ve o motivo ao tentar; o resto do app continua funcionando.
    async deactivateStudent(req: Request, res: Response): Promise<Response> {
        try {
            const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

            if (!reason) {
                throw new AppError("Informe o motivo da inativação. O aluno vê esse motivo no app.");
            }

            if (reason.length > 300) {
                throw new AppError("O motivo pode ter no máximo 300 caracteres.");
            }

            const { id } = await findGymStudent(req.gymId, req.params.studentId as string);

            await prisma.user.update({
                where: { id },
                data: { gymInactivatedAt: new Date(), gymInactiveReason: reason },
            });
            await cancelPendingCheckIns(id);

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    async activateStudent(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = await findGymStudent(req.gymId, req.params.studentId as string);

            await prisma.user.update({ where: { id }, data: { gymInactivatedAt: null, gymInactiveReason: null } });

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }

    // A academia cancela a matricula de um aluno que saiu. O vinculo com o
    // profissional nao muda: o personal pode continuar atendendo o aluno.
    async removeStudent(req: Request, res: Response): Promise<Response> {
        try {
            const studentId = req.params.studentId as string;

            if (!UUID_PATTERN.test(studentId)) {
                throw new AppError("Aluno não encontrado nesta academia.", 404);
            }

            const { count } = await prisma.user.updateMany({
                where: { id: studentId, gymId: req.gymId, role: "STUDENT" },
                data: { gymId: null, gymEnrolledAt: null, gymInactivatedAt: null, gymInactiveReason: null },
            });

            if (count === 0) {
                throw new AppError("Aluno não encontrado nesta academia.", 404);
            }

            await cancelPendingCheckIns(studentId);

            return res.status(204).send();
        } catch (error) {
            return handleError(error, res);
        }
    }
}
