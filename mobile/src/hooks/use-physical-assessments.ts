import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';
import type { PhysicalAssessment, PhysicalAssessmentInput } from '@/types/physical-assessment';

export function usePhysicalAssessments() {
  const { token } = useAuth();
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<PhysicalAssessment[]>('/physical-assessments', { token });
      setAssessments(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar suas avaliações.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const addAssessment = useCallback(
    async (input: PhysicalAssessmentInput) => {
      const created = await apiRequest<PhysicalAssessment>('/physical-assessments', {
        method: 'POST',
        body: input,
        token,
      });
      setAssessments((current) => [created, ...current]);
    },
    [token],
  );

  return { assessments, isLoading, error, reload: load, addAssessment };
}
