import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';
import type { Exercise } from '@/types/exercise';
import type { WorkoutDay, WorkoutEntry } from '@/types/workout';

export function useWorkoutPlan() {
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
        apiRequest<WorkoutDay[]>('/workout-plan', { token }),
        apiRequest<Exercise[]>('/exercises', { token }),
      ]);
      setPlan(planResult);
      setExercises(exercisesResult);
      hasLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar seu treino.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // A ficha (exercicios, series e repeticoes) e definida pelo profissional;
  // o aluno so registra a carga que usou em cada exercicio.
  const registerWeight = useCallback(
    async (id: string, weight: number | null) => {
      const updated = await apiRequest<WorkoutEntry>(`/workout-plan/${id}`, {
        method: 'PATCH',
        body: { weight },
        token,
      });
      setPlan((current) =>
        current.map((day) => ({
          ...day,
          entries: day.entries.map((entry) => (entry.id === id ? updated : entry)),
        })),
      );
    },
    [token],
  );

  return { plan, exercises, isLoading, error, reload: load, registerWeight };
}
