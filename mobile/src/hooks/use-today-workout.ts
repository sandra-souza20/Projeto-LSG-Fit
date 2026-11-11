import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { toDateKey } from '@/hooks/use-workout-sessions';
import { apiRequest } from '@/services/api';
import { WEEKDAY_LABELS, WEEKDAYS, WORKOUT_LETTERS, type Weekday, type WorkoutDay } from '@/types/workout';
import type { WorkoutSession } from '@/types/workout-session';

// Weekday de hoje no aparelho (Date.getDay: 0 = domingo).
const BY_JS_DAY: Weekday[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function todayWeekday(): Weekday {
  return BY_JS_DAY[new Date().getDay()]!;
}

/** Quantos dias faltam (1 a 7) a partir de amanha ate o dia da semana. */
function daysUntil(target: Weekday, from: Weekday): number {
  const diff = (WEEKDAYS.indexOf(target) - WEEKDAYS.indexOf(from) + 7) % 7;
  return diff === 0 ? 7 : diff;
}

/** "amanhã", "no sábado" ou "na próxima quinta" (mesmo dia, semana que vem). */
function whenLabel(days: number, day: Weekday): string {
  if (days === 1) return 'amanhã';
  const name = WEEKDAY_LABELS[day].toLowerCase();
  const article = day === 'SATURDAY' || day === 'SUNDAY' ? 'no' : 'na';
  return days === 7 ? `${article} próxim${article === 'no' ? 'o' : 'a'} ${name}` : `${article} ${name}`;
}

export type TodayWorkout = {
  // Treino de hoje (se houver e ainda nao foi feito) ou o proximo dia com treino.
  next: { day: WorkoutDay; letter: string; isToday: boolean; when: string } | null;
  // Ja concluiu o treino de hoje.
  trainedToday: boolean;
  // Hoje nao tem treino na ficha.
  isRestDay: boolean;
  // Texto de quando um dia da ficha pode ser feito ("hoje", "amanhã", "no domingo").
  availability: (day: Weekday) => string;
  isLoading: boolean;
  reload: () => Promise<void>;
};

// Regra: o treino do dia e o da ficha para o dia da semana de hoje, um por dia.
// O servidor tambem confere (409 NOT_TODAYS_WORKOUT e ALREADY_TRAINED_TODAY).
export function useTodayWorkout(plan: WorkoutDay[]): TodayWorkout {
  const { token } = useAuth();
  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!token) return;
    // Basta saber se ja treinou hoje: le os treinos de ontem para ca.
    const to = new Date();
    const from = new Date(to.getTime() - 36 * 60 * 60 * 1000);
    try {
      const sessions = await apiRequest<WorkoutSession[]>(
        `/workout-sessions?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        { token },
      );
      // A API devolve do mais antigo para o mais recente.
      setLastSession(sessions[sessions.length - 1] ?? null);
    } catch {
      // Sem o historico, considera que ainda nao treinou hoje (o servidor confere).
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  return useMemo(() => {
    const today = todayWeekday();
    const activeDays = plan.filter((day) => day.entries.length > 0);
    const letterOf = (day: Weekday) => WORKOUT_LETTERS[activeDays.findIndex((item) => item.dayOfWeek === day)]!;
    const trainedToday = Boolean(lastSession && toDateKey(new Date(lastSession.completedAt)) === toDateKey(new Date()));
    const todayDay = activeDays.find((day) => day.dayOfWeek === today);

    const availability = (day: Weekday) =>
      day === today ? (trainedToday ? 'concluído hoje' : 'hoje') : whenLabel(daysUntil(day, today), day);

    let next: TodayWorkout['next'] = null;
    if (todayDay && !trainedToday) {
      next = { day: todayDay, letter: letterOf(today), isToday: true, when: 'hoje' };
    } else if (activeDays.length > 0) {
      // Proximo dia com treino, a partir de amanha.
      const upcoming = [...activeDays].sort((a, b) => daysUntil(a.dayOfWeek, today) - daysUntil(b.dayOfWeek, today))[0]!;
      const days = daysUntil(upcoming.dayOfWeek, today);
      next = { day: upcoming, letter: letterOf(upcoming.dayOfWeek), isToday: false, when: whenLabel(days, upcoming.dayOfWeek) };
    }

    return { next, trainedToday, isRestDay: !todayDay, availability, isLoading, reload };
  }, [plan, lastSession, isLoading, reload]);
}
