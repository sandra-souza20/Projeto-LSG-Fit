import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';
import type { Exercise } from '@/types/exercise';
import type { Weekday, WorkoutDay, WorkoutEntry } from '@/types/workout';

// Mesma forma de useWorkoutPlan, mas operando sobre a ficha de um aluno
// especifico a partir da visao do profissional vinculado a ele.
export function useStudentWorkoutPlan(studentId: string) {
  const { token } = useAuth();
  const basePath = `/professionals/students/${studentId}/workout-plan`;
  const [plan, setPlan] = useState<WorkoutDay[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      const [planResult, exercisesResult] = await Promise.all([
        apiRequest<WorkoutDay[]>(basePath, { token }),
        apiRequest<Exercise[]>('/exercises', { token }),
      ]);
      setPlan(planResult);
      setExercises(exercisesResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o treino do aluno.');
    } finally {
      setIsLoading(false);
    }
  }, [token, basePath]);

  useEffect(() => {
    load();
  }, [load]);

  const addEntry = useCallback(
    async (input: { exerciseId: string; dayOfWeek: Weekday; sets: number; reps: number; weight: number | null }) => {
      const entry = await apiRequest<WorkoutEntry>(basePath, { method: 'POST', body: input, token });
      setPlan((current) =>
        current.map((day) =>
          day.dayOfWeek === input.dayOfWeek ? { ...day, entries: [...day.entries, entry] } : day,
        ),
      );
    },
    [token, basePath],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await apiRequest<void>(`${basePath}/${id}`, { method: 'DELETE', token });
      setPlan((current) => current.map((day) => ({ ...day, entries: day.entries.filter((entry) => entry.id !== id) })));
    },
    [token, basePath],
  );

  const updateEntry = useCallback(
    async (id: string, input: { sets: number; reps: number; weight: number | null }) => {
      const updated = await apiRequest<WorkoutEntry>(`${basePath}/${id}`, {
        method: 'PATCH',
        body: input,
        token,
      });
      setPlan((current) =>
        current.map((day) => ({
          ...day,
          entries: day.entries.map((entry) => (entry.id === id ? updated : entry)),
        })),
      );
    },
    [token, basePath],
  );

  return { plan, exercises, isLoading, error, addEntry, removeEntry, updateEntry };
}
