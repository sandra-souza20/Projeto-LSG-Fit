import { prisma } from "../database/prisma.js";
import type { Weekday } from "../../prisma/client/enums.js";
import { AppError } from "../utils/app-error.js";
import { APP_TIMEZONE, dayKey, dayRange, weekdayOf } from "../utils/app-day.js";

// Relatorio mensal da academia (docs/contrato-api.md, "Relatorio mensal").
// RNF05: so contagens, datas de treino, nomes e vinculos; nunca ficha de
// treino nem avaliacao fisica.
//
// Quem conta como aluno da academia num mes vem do historico da matricula
// (enrollment_events). Os treinos contados sao os dos alunos que estiveram
// matriculados em algum momento do mes, menos os feitos com check-in em outra
// academia.

const ABSENT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export const INVALID_MONTH_MESSAGE = "Informe um mês válido (aaaa-mm).";

type Period = { month: string; from: Date; end: Date; to: Date };

/** Periodo do mes no fuso do app. No mes atual, vai ate agora. */
export function monthPeriod(month: unknown, now = new Date()): Period {
    const current = dayKey(now).slice(0, 7);
    const value = month === undefined || month === "" ? current : month;

    if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value > current) {
        throw new AppError(INVALID_MONTH_MESSAGE);
    }

    const [year, monthNumber] = value.split("-").map(Number) as [number, number];
    const next = monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
    const from = dayRange(`${value}-01`).start;
    const end = dayRange(`${next}-01`).start;

    return { month: value, from, end, to: end < now ? end : now };
}

function previousMonth(month: string): string {
    const [year, monthNumber] = month.split("-").map(Number) as [number, number];
    return monthNumber === 1 ? `${year - 1}-12` : `${year}-${String(monthNumber - 1).padStart(2, "0")}`;
}

// enrolledDuringPeriod: esteve matriculado em algum momento do periodo, mesmo
// tendo saido antes do fim (os treinos dele ainda contam).
type StudentState = { enrolled: boolean; inactive: boolean; enrolledDuringPeriod: boolean };

/** Reproduz o historico da matricula ate o fim do periodo. */
async function enrollmentStates(gymId: string, period: Period) {
    const events = await prisma.enrollmentEvent.findMany({
        where: { gymId, at: { lt: period.to } },
        orderBy: { at: "asc" },
        select: { studentId: true, type: true, at: true },
    });

    const states = new Map<string, StudentState>();
    let newEnrollments = 0;
    let cancelledEnrollments = 0;

    for (const event of events) {
        const state = states.get(event.studentId) ?? { enrolled: false, inactive: false, enrolledDuringPeriod: false };
        const inPeriod = event.at >= period.from;

        if (event.type === "ENROLLED") {
            state.enrolled = true;
            state.inactive = false;
            if (inPeriod) {
                newEnrollments++;
                state.enrolledDuringPeriod = true;
            }
        } else if (event.type === "CANCELLED" || event.type === "LEFT") {
            // Saiu durante o mes: ainda conta os treinos feitos antes.
            if (inPeriod && state.enrolled) state.enrolledDuringPeriod = true;
            state.enrolled = false;
            state.inactive = false;
            if (inPeriod) cancelledEnrollments++;
        } else if (event.type === "DEACTIVATED") {
            state.inactive = true;
        } else if (event.type === "ACTIVATED") {
            state.inactive = false;
        }

        states.set(event.studentId, state);
    }

    return { states, newEnrollments, cancelledEnrollments };
}

async function buildCore(gymId: string, period: Period) {
    const { states, newEnrollments, cancelledEnrollments } = await enrollmentStates(gymId, period);

    const enrolledAtEnd = [...states].filter(([, state]) => state.enrolled).map(([id]) => id);
    const activeAtEnd = new Set([...states].filter(([, state]) => state.enrolled && !state.inactive).map(([id]) => id));
    const counted = [...states].filter(([, state]) => state.enrolled || state.enrolledDuringPeriod).map(([id]) => id);

    const sessions = counted.length
        ? await prisma.workoutSession.findMany({
              where: { userId: { in: counted }, completedAt: { gte: period.from, lt: period.to } },
              select: { userId: true, completedAt: true, checkIn: { select: { gymId: true } } },
          })
        : [];
    // Treino com check-in em outra academia nao conta aqui.
    const workouts = sessions.filter((session) => !session.checkIn || session.checkIn.gymId === gymId);

    return { states, enrolledAtEnd, activeAtEnd, counted, workouts, newEnrollments, cancelledEnrollments };
}

export type MonthlyReport = Awaited<ReturnType<typeof buildMonthlyReport>>["report"];

export async function buildMonthlyReport(gymId: string, monthInput: unknown) {
    const now = new Date();
    const period = monthPeriod(monthInput, now);
    const gym = await prisma.gym.findUniqueOrThrow({ where: { id: gymId }, select: { createdAt: true } });
    const core = await buildCore(gymId, period);

    const workoutsByStudent = new Map<string, number>();
    for (const workout of core.workouts) {
        workoutsByStudent.set(workout.userId, (workoutsByStudent.get(workout.userId) ?? 0) + 1);
    }

    // Ultimo treino de cada aluno ate o fim do periodo (em qualquer lugar).
    const lastWorkouts = core.counted.length
        ? await prisma.workoutSession.groupBy({
              by: ["userId"],
              where: { userId: { in: core.counted }, completedAt: { lt: period.to } },
              _max: { completedAt: true },
          })
        : [];
    const lastWorkoutOf = new Map(lastWorkouts.map((row) => [row.userId, row._max.completedAt]));

    const people = core.counted.length
        ? await prisma.user.findMany({
              where: { id: { in: core.counted } },
              select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  gymEnrolledAt: true,
                  professional: { select: { id: true, name: true } },
              },
          })
        : [];
    const personOf = new Map(people.map((person) => [person.id, person]));

    // Ausente: ativo no fim do periodo, sem treino ha mais de 7 dias (ou nunca treinou).
    const absentLimit = new Date(period.to.getTime() - ABSENT_DAYS * DAY_MS);
    const absent = [...core.activeAtEnd]
        .map((id) => ({ id, lastWorkoutAt: lastWorkoutOf.get(id) ?? null }))
        .filter((student) => !student.lastWorkoutAt || student.lastWorkoutAt < absentLimit)
        .sort((a, b) => (a.lastWorkoutAt?.getTime() ?? 0) - (b.lastWorkoutAt?.getTime() ?? 0));

    // Treinos por dia: um item por dia do mes, inclusive os dias sem treino.
    const byDayMap = new Map<string, number>();
    for (let cursor = period.from.getTime(); cursor < period.end.getTime(); cursor += DAY_MS) {
        byDayMap.set(dayKey(new Date(cursor + 12 * 60 * 60 * 1000)), 0);
    }
    const byWeekDay = Object.fromEntries(WEEKDAYS.map((day) => [day, 0])) as Record<Weekday, number>;
    for (const workout of core.workouts) {
        const key = dayKey(workout.completedAt);
        byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
        byWeekDay[weekdayOf(workout.completedAt)]++;
    }

    // Check-ins pedidos no mes.
    const checkIns = await prisma.checkIn.findMany({
        where: { gymId, requestedAt: { gte: period.from, lt: period.to } },
        select: { status: true, requestedAt: true, decidedAt: true },
    });
    const countStatus = (status: string) => checkIns.filter((checkIn) => checkIn.status === status).length;
    const decided = checkIns.filter(
        (checkIn) => (checkIn.status === "APPROVED" || checkIn.status === "DENIED") && checkIn.decidedAt,
    );
    const averageDecisionSeconds = decided.length
        ? Math.round(
              decided.reduce((sum, checkIn) => sum + (checkIn.decidedAt!.getTime() - checkIn.requestedAt.getTime()), 0) /
                  decided.length /
                  1000,
          )
        : null;

    // Por profissional (vinculo atual). Os profissionais da academia aparecem mesmo sem alunos.
    const gymProfessionals = await prisma.user.findMany({
        where: { gymId, role: "PROFESSIONAL" },
        select: { id: true, name: true },
    });
    const professionals = new Map(gymProfessionals.map((pro) => [pro.id, { ...pro, studentsCount: 0, workouts: 0 }]));
    const withoutProfessional = { studentsCount: 0, workouts: 0 };
    const enrolledSet = new Set(core.enrolledAtEnd);

    for (const id of core.counted) {
        const person = personOf.get(id);
        const pro = person?.professional;
        const bucket = pro
            ? (professionals.get(pro.id) ??
              professionals.set(pro.id, { ...pro, studentsCount: 0, workouts: 0 }).get(pro.id)!)
            : withoutProfessional;
        if (enrolledSet.has(id)) bucket.studentsCount++;
        bucket.workouts += workoutsByStudent.get(id) ?? 0;
    }

    const total = core.workouts.length;
    const enrolledCount = core.enrolledAtEnd.length;
    const activeCount = core.activeAtEnd.size;
    const trained = core.enrolledAtEnd.filter((id) => (workoutsByStudent.get(id) ?? 0) > 0).length;

    // Mes anterior, para comparar (null se a academia ainda nao existia).
    let previous: { workoutsTotal: number; activeStudents: number; newEnrollments: number } | null = null;
    const previousPeriod = monthPeriod(previousMonth(period.month), now);
    if (previousPeriod.end > gym.createdAt) {
        const previousCore = await buildCore(gymId, previousPeriod);
        previous = {
            workoutsTotal: previousCore.workouts.length,
            activeStudents: previousCore.activeAtEnd.size,
            newEnrollments: previousCore.newEnrollments,
        };
    }

    const report = {
        month: period.month,
        from: period.from,
        to: period.to < period.end ? period.to : new Date(period.end.getTime() - 1),
        generatedAt: now,

        students: {
            enrolled: enrolledCount,
            active: activeCount,
            inactive: enrolledCount - activeCount,
            newEnrollments: core.newEnrollments,
            cancelledEnrollments: core.cancelledEnrollments,
            absent: absent.length,
        },

        workouts: {
            total,
            averagePerActiveStudent: activeCount ? Math.round((total / activeCount) * 10) / 10 : 0,
            // Como no relatorio antigo do app: matriculados que treinaram pelo menos uma vez no mes.
            studentsWhoTrained: trained,
            trainedPercent: enrolledCount ? Math.round((trained / enrolledCount) * 100) : 0,
            byDay: [...byDayMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
            byWeekDay,
        },

        checkIns: {
            requested: checkIns.length,
            approved: countStatus("APPROVED"),
            denied: countStatus("DENIED"),
            expired: countStatus("EXPIRED"),
            cancelled: countStatus("CANCELLED"),
            averageDecisionSeconds,
        },

        professionals: [...professionals.values()].sort((a, b) => b.workouts - a.workouts || a.name.localeCompare(b.name)),
        withoutProfessional,

        topStudents: core.counted
            .filter((id) => (workoutsByStudent.get(id) ?? 0) > 0)
            .map((id) => ({
                id,
                name: personOf.get(id)?.name ?? "",
                workouts: workoutsByStudent.get(id) ?? 0,
                lastWorkoutAt: lastWorkoutOf.get(id) ?? null,
            }))
            .sort((a, b) => b.workouts - a.workouts || a.name.localeCompare(b.name))
            .slice(0, 10),

        absentStudents: absent.slice(0, 20).map((student) => ({
            id: student.id,
            name: personOf.get(student.id)?.name ?? "",
            lastWorkoutAt: student.lastWorkoutAt,
        })),

        previousMonth: previous,
    };

    // Linhas do CSV: um aluno matriculado no fim do periodo por linha.
    const rows = core.enrolledAtEnd
        .map((id) => {
            const person = personOf.get(id);
            return {
                name: person?.name ?? "",
                email: person?.email ?? "",
                phone: person?.phone ?? null,
                professional: person?.professional?.name ?? null,
                status: core.activeAtEnd.has(id) ? "Ativo" : "Inativo",
                enrolledAt: person?.gymEnrolledAt ?? null,
                workouts: workoutsByStudent.get(id) ?? 0,
                lastWorkoutAt: lastWorkoutOf.get(id) ?? null,
            };
        })
        .sort((a, b) => b.workouts - a.workouts || a.name.localeCompare(b.name));

    return { report, rows };
}

function csvCell(value: string | number | null) {
    const text = value === null ? "" : String(value);
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const formatDate = (value: Date | null) => (value ? value.toLocaleDateString("pt-BR", { timeZone: APP_TIMEZONE }) : "");

/** CSV com ";" e BOM UTF-8, para o Excel em portugues abrir com acentos certos. */
export function monthlyReportCsv(rows: Awaited<ReturnType<typeof buildMonthlyReport>>["rows"]): string {
    const header = ["Aluno", "E-mail", "Telefone", "Profissional", "Status", "Matriculado em", "Treinos no mês", "Último treino"];
    const lines = rows.map((row) => [
        row.name,
        row.email,
        row.phone,
        row.professional ?? "Sem profissional",
        row.status,
        formatDate(row.enrolledAt),
        row.workouts,
        formatDate(row.lastWorkoutAt),
    ]);

    return "﻿" + [header, ...lines].map((line) => line.map(csvCell).join(";")).join("\r\n");
}
