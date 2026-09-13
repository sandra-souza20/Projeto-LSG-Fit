import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';

type Student = {
  id: string;
  name: string;
  email: string;
};

export function useProfessionalStudents() {
  const { token } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Student[]>('/professionals/students', { token });
      setStudents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar seus alunos.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { students, isLoading, error, reload: load };
}
