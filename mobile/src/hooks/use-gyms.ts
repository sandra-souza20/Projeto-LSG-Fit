import { useCallback, useEffect, useState } from 'react';

import { apiRequest } from '@/services/api';

export type GymSummary = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

// Lista publica: usada tambem no cadastro do profissional, antes do login.
export function useGyms() {
  const [gyms, setGyms] = useState<GymSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setGyms(await apiRequest<GymSummary[]>('/gyms'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as academias.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { gyms, isLoading, error, reload: load };
}
