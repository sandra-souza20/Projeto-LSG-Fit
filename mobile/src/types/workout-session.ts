import type { Weekday } from './workout';

export type WorkoutSession = {
  id: string;
  dayOfWeek: Weekday;
  completedAt: string;
};
