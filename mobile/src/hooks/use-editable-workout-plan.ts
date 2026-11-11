import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';
import type { Exercise } from '@/types/exercise';
import type { Weekday, WorkoutDay, WorkoutEntry } from '@/types/workout';

export type NewEntryInput = {
  exerciseId: string;
  dayOfWeek: Weekday;
  sets: number;
  reps: number;
  weight: number | null;
  restSeconds: number | null;
};

export type EntryChanges = Partial<{ sets: number; reps: number; weight: number | null; restSeconds: number | null }>;

// Ficha editavel: o aluno edita a propria (/workout-plan) e o profissional a
// de um aluno dele (/professionals/students/:id/workout-plan). A biblioteca de
// exercicios vem junto, com `availableAtGym` calculado para a academia do aluno.
export function useEditableWorkoutPlan({
  planPath,
  exercisesPath,
  loadErrorMessage,
}: {
  planPath: string;
  exercisesPath: string;
  loadErrorMessage: string;
}) {
  const { token } = useAuth();
  const [plan, setPlan] = useState<WorkoutDay[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Depois da primeira carga, recargas (ex.: ao voltar para a tela) acontecem
  // sem trocar a lista pelo indicador de carregamento.
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;

    if (!hasLoaded.current) setIsLoading(true);
    setError(null);
    try {
      const [planResult, exercisesResult] = await Promise.all([
        apiRequest<WorkoutDay[]>(planPath, { token }),
        apiRequest<Exercise[]>(exercisesPath, { token }),
      ]);
      setPlan(planResult);
      setExercises(exercisesResult);
      hasLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : loadErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [token, planPath, exercisesPath, loadErrorMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const replaceEntry = useCallback((updated: WorkoutEntry) => {
    setPlan((current) =>
      current.map((day) => ({
        ...day,
        entries: day.entries.map((entry) => (entry.id === updated.id ? updated : entry)),
      })),
    );
  }, []);

  const addEntry = useCallback(
    async (input: NewEntryInput) => {
      const entry = await apiRequest<WorkoutEntry>(planPath, { method: 'POST', body: input, token });
      setPlan((current) =>
        current.map((day) => (day.dayOfWeek === input.dayOfWeek ? { ...day, entries: [...day.entries, entry] } : day)),
      );
    },
    [token, planPath],
  );

  const updateEntry = useCallback(
    async (id: string, changes: EntryChanges) => {
      const updated = await apiRequest<WorkoutEntry>(`${planPath}/${id}`, { method: 'PATCH', body: changes, token });
      replaceEntry(updated);
    },
    [token, planPath, replaceEntry],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await apiRequest<void>(`${planPath}/${id}`, { method: 'DELETE', token });
      setPlan((current) => current.map((day) => ({ ...day, entries: day.entries.filter((entry) => entry.id !== id) })));
    },
    [token, planPath],
  );

  return { plan, exercises, isLoading, error, reload: load, addEntry, updateEntry, removeEntry };
}
