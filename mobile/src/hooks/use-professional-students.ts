import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';

type Student = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  lastWorkoutAt: string | null;
  workoutsLast30Days: number;
};

export function useProfessionalStudents() {
  const { token } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;

    if (!hasLoaded.current) setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Student[]>('/professionals/students', { token });
      setStudents(result);
      hasLoaded.current = true;
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
