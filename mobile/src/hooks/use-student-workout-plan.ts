import { useEditableWorkoutPlan } from '@/hooks/use-editable-workout-plan';

// Ficha de um aluno especifico, na visao do profissional vinculado a ele.
// `?studentId=` faz a biblioteca dizer o que existe na academia desse aluno.
export function useStudentWorkoutPlan(studentId: string) {
  return useEditableWorkoutPlan({
    planPath: `/professionals/students/${studentId}/workout-plan`,
    exercisesPath: `/exercises?studentId=${encodeURIComponent(studentId)}`,
    loadErrorMessage: 'Não foi possível carregar o treino do aluno.',
  });
}
