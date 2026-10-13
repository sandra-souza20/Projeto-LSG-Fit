import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';
import type { Weekday } from '@/types/workout';
import type { WorkoutSession } from '@/types/workout-session';

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Frequencia do mes (RF04). Sem studentId le os treinos do proprio aluno;
// com studentId le os de um aluno pela visao do profissional vinculado.
export function useWorkoutSessions(month: Date, studentId?: string, refreshKey?: number) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const basePath = studentId ? `/professionals/students/${studentId}/workout-sessions` : '/workout-sessions';

  const load = useCallback(async () => {
    if (!token) return;

    // Inicio e fim do mes no fuso do aparelho.
    const from = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const to = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<WorkoutSession[]>(
        `${basePath}?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        { token },
      );
      setSessions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a frequência.');
    } finally {
      setIsLoading(false);
    }
  }, [token, basePath, year, monthIndex]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const trainedDays = useMemo(
    () => new Set(sessions.map((session) => toDateKey(new Date(session.completedAt)))),
    [sessions],
  );

  return { sessions, trainedDays, isLoading, error, reload: load };
}

export function useFinishWorkout() {
  const { token } = useAuth();

  return useCallback(
    (dayOfWeek: Weekday) =>
      apiRequest<WorkoutSession>('/workout-sessions', { method: 'POST', body: { dayOfWeek }, token }),
    [token],
  );
}
