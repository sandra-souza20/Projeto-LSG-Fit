import type { Exercise } from './exercise';

export const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: 'Segunda',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta',
  FRIDAY: 'Sexta',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

// Letras usadas pro aluno em "Meu treino": os dias com exercicio recebem
// A, B, C... na ordem em que aparecem (nao presas ao dia da semana), entao
// 3 dias de treino viram sempre Treino A/B/C, nunca pulando letras.
export const WORKOUT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export type WorkoutEntry = {
  id: string;
  sets: number;
  reps: number;
  weight: number | null;
  order: number;
  exercise: Exercise;
};

export type WorkoutDay = {
  dayOfWeek: Weekday;
  entries: WorkoutEntry[];
};
