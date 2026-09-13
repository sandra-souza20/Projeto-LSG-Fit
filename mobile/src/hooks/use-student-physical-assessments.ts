import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';
import type { PhysicalAssessment, PhysicalAssessmentInput } from '@/types/physical-assessment';

// Mesma forma de usePhysicalAssessments, mas pela visao do profissional
// registrando/consultando a evolucao de um aluno especifico.
export function useStudentPhysicalAssessments(studentId: string) {
  const { token } = useAuth();
  const basePath = `/professionals/students/${studentId}/physical-assessments`;
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<PhysicalAssessment[]>(basePath, { token });
      setAssessments(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as avaliações do aluno.');
    } finally {
      setIsLoading(false);
    }
  }, [token, basePath]);

  useEffect(() => {
    load();
  }, [load]);

  const addAssessment = useCallback(
    async (input: PhysicalAssessmentInput) => {
      const created = await apiRequest<PhysicalAssessment>(basePath, {
        method: 'POST',
        body: input,
        token,
      });
      setAssessments((current) => [created, ...current]);
    },
    [token, basePath],
  );

  return { assessments, isLoading, error, addAssessment };
}
