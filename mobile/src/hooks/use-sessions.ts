import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/services/api';
import type { SessionListItem } from '@/types/user';

// Sessoes abertas da conta (dispositivos conectados).
export function useSessions() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      setSessions(await apiRequest<SessionListItem[]>('/sessions', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os dispositivos.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Encerra a sessao de outro dispositivo. A sessao atual sai pelo signOut do contexto.
  const revoke = useCallback(
    async (sessionId: string) => {
      await apiRequest<void>(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE', token });
      setSessions((current) => current.filter((session) => session.id !== sessionId));
    },
    [token],
  );

  return { sessions, isLoading, error, reload: load, revoke };
}
