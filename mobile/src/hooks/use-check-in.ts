import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';
import type { CheckIn, CheckInToday } from '@/types/check-in';

// Enquanto o pedido esta pendente, pergunta ao servidor a cada 3 s.
const POLL_MS = 3000;

// Check-in de hoje. `canTrain` diz se o aluno pode iniciar o treino do dia:
// sem academia, sempre; matriculado, so com check-in aprovado e ainda nao usado.
export function useCheckIn() {
  const { token } = useAuth();
  const [today, setToday] = useState<CheckInToday | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      setToday(await apiRequest<CheckInToday>('/check-ins/today', { token }));
    } catch {
      // Mantem o ultimo estado; a proxima consulta tenta de novo.
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isPending = today?.checkIn?.status === 'PENDING';

  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(reload, POLL_MS);
    return () => clearInterval(interval);
  }, [isPending, reload]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível concluir o check-in.');
      } finally {
        setIsSubmitting(false);
        await reload();
      }
    },
    [reload],
  );

  const requestCheckIn = useCallback(
    () => run(() => apiRequest<CheckIn>('/check-ins', { method: 'POST', token })),
    [run, token],
  );
  const cancelCheckIn = useCallback(
    () => run(() => apiRequest<CheckIn>('/check-ins/today', { method: 'DELETE', token })),
    [run, token],
  );

  const checkIn = today?.checkIn ?? null;
  const canTrain =
    today !== null && (!today.required || (checkIn?.status === 'APPROVED' && !checkIn.used && !today.inactive));

  return { today, checkIn, canTrain, isLoading: today === null, isSubmitting, error, reload, requestCheckIn, cancelCheckIn };
}
