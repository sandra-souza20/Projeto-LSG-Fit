import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';

export type ProfessionalSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  bio: string | null;
  gymId: string | null;
  gym: { id: string; name: string } | null;
  studentsCount: number;
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

// Ordem para o aluno: primeiro o profissional dele, depois os da academia em
// que ele esta matriculado, e o resto por nome (a API ja devolve ordenado).
export function sortProfessionalsForStudent(
  professionals: ProfessionalSummary[],
  student: { professionalId?: string | null; gymId?: string | null } | null,
) {
  const rank = (professional: ProfessionalSummary) => {
    if (professional.id === student?.professionalId) return 0;
    if (student?.gymId && professional.gymId === student.gymId) return 1;
    return 2;
  };

  return [...professionals].sort((a, b) => rank(a) - rank(b));
}
