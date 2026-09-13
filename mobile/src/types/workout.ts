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

// Rotulo alternativo mostrado pro aluno em "Meu treino": cada dia vira uma
// letra de treino (Treino A, Treino B...) em vez do nome do dia da semana.
export const WORKOUT_LETTER_LABELS: Record<Weekday, string> = {
  MONDAY: 'Treino A',
  TUESDAY: 'Treino B',
  WEDNESDAY: 'Treino C',
  THURSDAY: 'Treino D',
  FRIDAY: 'Treino E',
  SATURDAY: 'Treino F',
  SUNDAY: 'Treino G',
};

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
