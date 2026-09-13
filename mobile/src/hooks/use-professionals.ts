import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';

export type ProfessionalSummary = {
  id: string;
  name: string;
  email: string;
  gymId: string | null;
};

export function useProfessionals() {
  const { token } = useAuth();
  const [professionals, setProfessionals] = useState<ProfessionalSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<ProfessionalSummary[]>('/professionals', { token });
      setProfessionals(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os profissionais.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { professionals, isLoading, error, reload: load };
}
