import type { GymStudent } from '@/components/gym/gym-students-tab';

// Caso de uso "Gerar Registro": relatorio mensal da academia, montado no
// aparelho a partir da lista de alunos com a frequencia do mes.

export type GymReport = {
  gymName: string;
  month: Date;
  generatedAt: Date;
  students: GymStudent[];
  // Ausencia so faz sentido no mes atual (conta a partir de hoje).
  absentCount: number | null;
};

const formatDate = (value: string | Date | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '-';

export function monthTitle(month: Date) {
  const label = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthRange(month: Date) {
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function isInMonth(value: string | null, month: Date) {
  if (!value) return false;
  const { from, to } = monthRange(month);
  const date = new Date(value);
  return date >= from && date <= to;
}

function summarize(report: GymReport) {
  const { students, month } = report;
  const totalWorkouts = students.reduce((sum, student) => sum + student.workoutsInRange, 0);
  const trained = students.filter((student) => student.workoutsInRange > 0).length;
  const newEnrollments = students.filter((student) => isInMonth(student.gymEnrolledAt, month)).length;
  const average = students.length ? totalWorkouts / students.length : 0;
  const trainedPercent = students.length ? Math.round((trained / students.length) * 100) : 0;

  const byProfessional = new Map<string, { students: number; workouts: number }>();
  for (const student of students) {
    const key = student.professional?.name ?? 'Sem personal';
    const current = byProfessional.get(key) ?? { students: 0, workouts: 0 };
    byProfessional.set(key, {
      students: current.students + 1,
      workouts: current.workouts + student.workoutsInRange,
    });
  }

  return { totalWorkouts, trained, newEnrollments, average, trainedPercent, byProfessional };
}

export function buildReportText(report: GymReport) {
  const { students, gymName, month, generatedAt, absentCount } = report;
  const summary = summarize(report);
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  const lines = [
    `RELATÓRIO MENSAL - ${gymName}`,
    monthTitle(month),
    `Gerado em ${formatDate(generatedAt)} pelo LSG FIT`,
    '',
    'RESUMO',
    `- Alunos matriculados (hoje): ${students.length} (${plural(summary.newEnrollments, 'novo', 'novos')} no mês)`,
    `- Treinos realizados no mês: ${summary.totalWorkouts}`,
    `- Alunos que treinaram: ${summary.trained} de ${students.length} (${summary.trainedPercent}%)`,
    `- Média de treinos por aluno: ${summary.average.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`,
  ];

  if (absentCount !== null) {
    lines.push(`- Alunos ausentes (7 dias ou mais sem treinar): ${absentCount}`);
  }

  if (summary.byProfessional.size > 0) {
    lines.push('', 'POR PROFISSIONAL');
    for (const [name, data] of summary.byProfessional) {
      lines.push(`- ${name}: ${plural(data.students, 'aluno', 'alunos')}, ${plural(data.workouts, 'treino', 'treinos')}`);
    }
  }

  if (students.length > 0) {
    lines.push('', 'FREQUÊNCIA POR ALUNO');
    const sorted = [...students].sort((a, b) => b.workoutsInRange - a.workoutsInRange || a.name.localeCompare(b.name));
    for (const student of sorted) {
      lines.push(
        `- ${student.name}: ${plural(student.workoutsInRange, 'treino', 'treinos')} (último: ${formatDate(student.lastWorkoutAt)})`,
      );
    }
  }

  return lines.join('\n');
}

function csvCell(value: string | number | null) {
  const text = value === null ? '' : String(value);
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Separador ";" e BOM UTF-8 para o Excel em portugues abrir com acentos certos.
export function buildReportCsv(report: GymReport) {
  const header = ['Aluno', 'E-mail', 'Telefone', 'Personal', 'Matriculado em', 'Treinos no mês', 'Último treino'];
  const rows = report.students.map((student) => [
    student.name,
    student.email,
    student.phone,
    student.professional?.name ?? 'Sem personal',
    formatDate(student.gymEnrolledAt),
    student.workoutsInRange,
    formatDate(student.lastWorkoutAt),
  ]);

  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
}

export function reportFileName(report: GymReport) {
  const { month } = report;
  return `relatorio-${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}.csv`;
}
