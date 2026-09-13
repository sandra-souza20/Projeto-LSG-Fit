import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiRequest } from '@/services/api';
import type {
  ActorRole,
  AuthResponse,
  MessageResponse,
  Professional,
  ProfessionalAuthResponse,
  ProfessionalRegisterResponse,
  RegisterResponse,
  User,
} from '@/types/user';

const TOKEN_KEY = 'lsgfit.token';
const ROLE_KEY = 'lsgfit.role';

type SignInInput = { email: string; password: string };
type SignUpInput = { name: string; email: string; password: string; confirmPassword: string };
type VerifyEmailInput = { email: string; code: string };
type ResendVerificationInput = { email: string };
type RequestPasswordResetInput = { email: string };
type ResetPasswordInput = { email: string; code: string; password: string; confirmPassword: string };

type AuthContextValue = {
  role: ActorRole | null;
  user: User | null;
  professional: Professional | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  verifyEmail: (input: VerifyEmailInput) => Promise<void>;
  resendVerificationCode: (input: ResendVerificationInput) => Promise<void>;
  requestPasswordReset: (input: RequestPasswordResetInput) => Promise<void>;
  resetPassword: (input: ResetPasswordInput) => Promise<void>;
  professionalSignIn: (input: SignInInput) => Promise<void>;
  professionalSignUp: (input: SignUpInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<ActorRole | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (!storedToken) return;

        // Sessoes salvas antes da introducao de papeis nao tem ROLE_KEY:
        // trata-las como STUDENT mantem quem ja estava logado autenticado.
        const storedRole = ((await AsyncStorage.getItem(ROLE_KEY)) as ActorRole | null) ?? 'STUDENT';

        if (storedRole === 'PROFESSIONAL') {
          const restoredProfessional = await apiRequest<Professional>('/professionals/me', { token: storedToken });
          setToken(storedToken);
          setRole('PROFESSIONAL');
          setProfessional(restoredProfessional);
        } else {
          const restoredUser = await apiRequest<User>('/users/me', { token: storedToken });
          setToken(storedToken);
          setRole('STUDENT');
          setUser(restoredUser);
        }
      } catch {
        await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY]);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const persistStudentSession = useCallback(async (result: AuthResponse) => {
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    await AsyncStorage.setItem(ROLE_KEY, 'STUDENT');
    setToken(result.token);
    setRole('STUDENT');
    setUser(result.user);
    setProfessional(null);
  }, []);

  const persistProfessionalSession = useCallback(async (result: ProfessionalAuthResponse) => {
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    await AsyncStorage.setItem(ROLE_KEY, 'PROFESSIONAL');
    setToken(result.token);
    setRole('PROFESSIONAL');
    setProfessional(result.professional);
    setUser(null);
  }, []);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const result = await apiRequest<AuthResponse>('/sessions', { method: 'POST', body: input });
      await persistStudentSession(result);
    },
    [persistStudentSession],
  );

  const signUp = useCallback(async (input: SignUpInput) => {
    // Account is created unverified: no session is persisted until the
    // e-mail code is confirmed via verifyEmail.
    await apiRequest<RegisterResponse>('/users', { method: 'POST', body: input });
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY]);
    setToken(null);
    setRole(null);
    setUser(null);
    setProfessional(null);
  }, []);

  const verifyEmail = useCallback(
    async (input: VerifyEmailInput) => {
      const result = await apiRequest<AuthResponse>('/users/verify', { method: 'POST', body: input });
      await persistStudentSession(result);
    },
    [persistStudentSession],
  );

  const resendVerificationCode = useCallback(async (input: ResendVerificationInput) => {
    await apiRequest<MessageResponse>('/users/resend-verification', { method: 'POST', body: input });
  }, []);

  const requestPasswordReset = useCallback(async (input: RequestPasswordResetInput) => {
    await apiRequest<MessageResponse>('/users/forgot-password', { method: 'POST', body: input });
  }, []);

  const resetPassword = useCallback(
    async (input: ResetPasswordInput) => {
      const result = await apiRequest<AuthResponse>('/users/reset-password', { method: 'POST', body: input });
      await persistStudentSession(result);
    },
    [persistStudentSession],
  );

  const professionalSignIn = useCallback(
    async (input: SignInInput) => {
      const result = await apiRequest<ProfessionalAuthResponse>('/professionals/sessions', {
        method: 'POST',
        body: input,
      });
      await persistProfessionalSession(result);
    },
    [persistProfessionalSession],
  );

  const professionalSignUp = useCallback(
    async (input: SignUpInput) => {
      // Professionals have no e-mail verification step yet, so signing up
      // logs the account in right away.
      await apiRequest<ProfessionalRegisterResponse>('/professionals', { method: 'POST', body: input });
      await professionalSignIn({ email: input.email, password: input.password });
    },
    [professionalSignIn],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      user,
      professional,
      token,
      isLoading,
      isAuthenticated: Boolean(token && role),
      signIn,
      signUp,
      signOut,
      verifyEmail,
      resendVerificationCode,
      requestPasswordReset,
      resetPassword,
      professionalSignIn,
      professionalSignUp,
    }),
    [
      role,
      user,
      professional,
      isLoading,
      token,
      signIn,
      signUp,
      signOut,
      verifyEmail,
      resendVerificationCode,
      requestPasswordReset,
      resetPassword,
      professionalSignIn,
      professionalSignUp,
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
