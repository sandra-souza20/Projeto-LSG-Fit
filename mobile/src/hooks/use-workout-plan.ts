import { useCallback } from 'react';

import { useEditableWorkoutPlan } from '@/hooks/use-editable-workout-plan';

// Ficha do proprio aluno. Ele monta a ficha como o profissional (adiciona,
// edita e remove exercicios); os dois editam a mesma ficha.
export function useWorkoutPlan() {
  const editable = useEditableWorkoutPlan({
    planPath: '/workout-plan',
    exercisesPath: '/exercises',
    loadErrorMessage: 'Não foi possível carregar seu treino.',
  });
  const { updateEntry } = editable;

  // Atalho usado na tela de execucao do treino.
  const registerWeight = useCallback(
    (id: string, weight: number | null) => updateEntry(id, { weight }),
    [updateEntry],
  );

  return { ...editable, registerWeight };
}
