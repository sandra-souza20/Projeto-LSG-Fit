import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ApiError, apiRequest, setSessionExpiredHandler } from '@/services/api';
import { clearStoredToken, getStoredToken, saveToken } from '@/services/token-storage';
import type { MessageResponse, RegisterResponse, SessionResponse, User, UserRole } from '@/types/user';

type SignInInput = { email: string; password: string };
type SignUpInput = { name: string; email: string; password: string; confirmPassword: string; gymId?: string | null };
// specialty e bio so sao aceitos para profissional; o servidor ignora gymId e role.
type UpdateUserInput = {
  name?: string;
  phone?: string | null;
  specialty?: string | null;
  bio?: string | null;
};
type VerifyEmailInput = { email: string; code: string };
type EmailInput = { email: string };
type CodePasswordInput = { email: string; code: string; password: string; confirmPassword: string };

type AuthContextValue = {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Login unico de aluno e profissional; o papel vem em user.role.
  signIn: (input: SignInInput) => Promise<void>;
  // Cadastro so de aluno: o profissional e cadastrado pela academia no app web.
  signUp: (input: SignUpInput) => Promise<{ needsVerification: boolean }>;
  verifyEmail: (input: VerifyEmailInput) => Promise<void>;
  resendVerificationCode: (input: EmailInput) => Promise<void>;
  // Tambem reenvia o convite quando o e-mail e de um profissional ainda nao ativado.
  requestPasswordReset: (input: EmailInput) => Promise<void>;
  resetPassword: (input: CodePasswordInput) => Promise<void>;
  // Primeiro acesso do profissional: cria a senha com o codigo recebido por e-mail.
  activateAccount: (input: CodePasswordInput) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  updateUser: (input: UpdateUserInput) => Promise<void>;
  linkProfessional: (professionalId: string | null) => Promise<void>;
  linkGym: (gymId: string | null) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Limpa so o estado local (o servidor ja nao reconhece ou ja encerrou a sessao).
  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    await clearStoredToken();
  }, []);

  // Qualquer 401 SESSION_EXPIRED em chamada autenticada volta para o login.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSession();
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await getStoredToken();
        if (!storedToken) return;

        const restoredUser = await apiRequest<User>('/users/me', { token: storedToken });
        setToken(storedToken);
        setUser(restoredUser);
      } catch (err) {
        // Sem conexao, o token continua guardado para a proxima abertura;
        // qualquer resposta do servidor recusando a sessao o descarta.
        if (!(err instanceof ApiError && err.status === 0)) {
          await clearStoredToken();
        }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const startSession = useCallback(async (result: SessionResponse) => {
    await saveToken(result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const result = await apiRequest<SessionResponse>('/sessions', { method: 'POST', body: input });
      await startSession(result);
    },
    [startSession],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      // A conta nasce sem confirmacao: a sessao so comeca no verifyEmail. Quando
      // o servidor dispensa a confirmacao, ele ja devolve o token aqui.
      const result = await apiRequest<RegisterResponse>('/users', { method: 'POST', body: input });

      if (result.token && result.sessionId) {
        await startSession({ user: result.user, token: result.token, sessionId: result.sessionId });
        return { needsVerification: false };
      }

      return { needsVerification: true };
    },
    [startSession],
  );

  const verifyEmail = useCallback(
    async (input: VerifyEmailInput) => {
      const result = await apiRequest<SessionResponse>('/users/verify', { method: 'POST', body: input });
      await startSession(result);
    },
    [startSession],
  );

  const resendVerificationCode = useCallback(async (input: EmailInput) => {
    await apiRequest<MessageResponse>('/users/resend-verification', { method: 'POST', body: input });
  }, []);

  const requestPasswordReset = useCallback(async (input: EmailInput) => {
    await apiRequest<MessageResponse>('/users/forgot-password', { method: 'POST', body: input });
  }, []);

  const resetPassword = useCallback(
    async (input: CodePasswordInput) => {
      const result = await apiRequest<SessionResponse>('/users/reset-password', { method: 'POST', body: input });
      await startSession(result);
    },
    [startSession],
  );

  const activateAccount = useCallback(
    async (input: CodePasswordInput) => {
      const result = await apiRequest<SessionResponse>('/users/activate', { method: 'POST', body: input });
      await startSession(result);
    },
    [startSession],
  );

  const signOut = useCallback(async () => {
    try {
      if (token) {
        await apiRequest<void>('/sessions/current', { method: 'DELETE', token });
      }
    } catch {
      // Mesmo sem resposta do servidor, o aparelho deixa de guardar a sessao.
    } finally {
      await clearSession();
    }
  }, [token, clearSession]);

  const signOutAllDevices = useCallback(async () => {
    await apiRequest<void>('/sessions', { method: 'DELETE', token });
    await clearSession();
  }, [token, clearSession]);

  const updateUser = useCallback(
    async (input: UpdateUserInput) => {
      setUser(await apiRequest<User>('/users/me', { method: 'PATCH', body: input, token }));
    },
    [token],
  );

  const linkProfessional = useCallback(
    async (professionalId: string | null) => {
      setUser(
        await apiRequest<User>('/users/me/professional', { method: 'PATCH', body: { professionalId }, token }),
      );
    },
    [token],
  );

  const linkGym = useCallback(
    async (gymId: string | null) => {
      setUser(await apiRequest<User>('/users/me/gym', { method: 'PATCH', body: { gymId }, token }));
    },
    [token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      signIn,
      signUp,
      verifyEmail,
      resendVerificationCode,
      requestPasswordReset,
      resetPassword,
      activateAccount,
      signOut,
      signOutAllDevices,
      updateUser,
      linkProfessional,
      linkGym,
    }),
    [
      user,
      token,
      isLoading,
      signIn,
      signUp,
      verifyEmail,
      resendVerificationCode,
      requestPasswordReset,
      resetPassword,
      activateAccount,
      signOut,
      signOutAllDevices,
      updateUser,
      linkProfessional,
      linkGym,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
