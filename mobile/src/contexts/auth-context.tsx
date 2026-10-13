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
  Gym,
  GymAuthResponse,
  GymRegisterResponse,
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
type ProfessionalSignUpInput = SignUpInput & { phone?: string; specialty?: string; gymId?: string | null };
type GymSignUpInput = SignUpInput & { phone?: string; address?: string };
type UpdateUserInput = { name?: string; phone?: string | null };
type UpdateProfessionalInput = {
  name?: string;
  phone?: string | null;
  specialty?: string | null;
  bio?: string | null;
  gymId?: string | null;
};
type UpdateGymInput = { name?: string; phone?: string | null; address?: string | null };
type VerifyEmailInput = { email: string; code: string };
type ResendVerificationInput = { email: string };
type RequestPasswordResetInput = { email: string };
type ResetPasswordInput = { email: string; code: string; password: string; confirmPassword: string };

type AuthContextValue = {
  role: ActorRole | null;
  user: User | null;
  professional: Professional | null;
  gym: Gym | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsVerification: boolean }>;
  signOut: () => Promise<void>;
  verifyEmail: (input: VerifyEmailInput) => Promise<void>;
  resendVerificationCode: (input: ResendVerificationInput) => Promise<void>;
  requestPasswordReset: (input: RequestPasswordResetInput) => Promise<void>;
  resetPassword: (input: ResetPasswordInput) => Promise<void>;
  professionalSignIn: (input: SignInInput) => Promise<void>;
  professionalSignUp: (input: ProfessionalSignUpInput) => Promise<void>;
  gymSignIn: (input: SignInInput) => Promise<void>;
  gymSignUp: (input: GymSignUpInput) => Promise<void>;
  linkProfessional: (professionalId: string | null) => Promise<void>;
  updateUser: (input: UpdateUserInput) => Promise<void>;
  updateProfessional: (input: UpdateProfessionalInput) => Promise<void>;
  updateGym: (input: UpdateGymInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<ActorRole | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
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

        if (storedRole === 'GYM') {
          const restoredGym = await apiRequest<Gym>('/gyms/me', { token: storedToken });
          setToken(storedToken);
          setRole('GYM');
          setGym(restoredGym);
        } else if (storedRole === 'PROFESSIONAL') {
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
    setGym(null);
  }, []);

  const persistProfessionalSession = useCallback(async (result: ProfessionalAuthResponse) => {
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    await AsyncStorage.setItem(ROLE_KEY, 'PROFESSIONAL');
    setToken(result.token);
    setRole('PROFESSIONAL');
    setProfessional(result.professional);
    setUser(null);
    setGym(null);
  }, []);

  const persistGymSession = useCallback(async (result: GymAuthResponse) => {
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    await AsyncStorage.setItem(ROLE_KEY, 'GYM');
    setToken(result.token);
    setRole('GYM');
    setGym(result.gym);
    setUser(null);
    setProfessional(null);
  }, []);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const result = await apiRequest<AuthResponse>('/sessions', { method: 'POST', body: input });
      await persistStudentSession(result);
    },
    [persistStudentSession],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      // Account is created unverified: no session is persisted until the
      // e-mail code is confirmed via verifyEmail. When the server skips
      // e-mail verification it returns a token and the session starts here.
      const result = await apiRequest<RegisterResponse>('/users', { method: 'POST', body: input });

      if (result.token) {
        await persistStudentSession({ user: result.user, token: result.token });
        return { needsVerification: false };
      }

      return { needsVerification: true };
    },
    [persistStudentSession],
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY]);
    setToken(null);
    setRole(null);
    setUser(null);
    setProfessional(null);
    setGym(null);
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
    async (input: ProfessionalSignUpInput) => {
      // Professionals have no e-mail verification step yet, so signing up
      // logs the account in right away.
      await apiRequest<ProfessionalRegisterResponse>('/professionals', { method: 'POST', body: input });
      await professionalSignIn({ email: input.email, password: input.password });
    },
    [professionalSignIn],
  );

  // Academias tambem nao tem confirmacao de e-mail: cadastra e ja entra.
  const gymSignIn = useCallback(
    async (input: SignInInput) => {
      const result = await apiRequest<GymAuthResponse>('/gyms/sessions', { method: 'POST', body: input });
      await persistGymSession(result);
    },
    [persistGymSession],
  );

  const gymSignUp = useCallback(
    async (input: GymSignUpInput) => {
      await apiRequest<GymRegisterResponse>('/gyms', { method: 'POST', body: input });
      await gymSignIn({ email: input.email, password: input.password });
    },
    [gymSignIn],
  );

  const updateUser = useCallback(
    async (input: UpdateUserInput) => {
      const updated = await apiRequest<User>('/users/me', { method: 'PATCH', body: input, token });
      setUser(updated);
    },
    [token],
  );

  const updateProfessional = useCallback(
    async (input: UpdateProfessionalInput) => {
      const updated = await apiRequest<Professional>('/professionals/me', {
        method: 'PATCH',
        body: input,
        token,
      });
      setProfessional(updated);
    },
    [token],
  );

  const updateGym = useCallback(
    async (input: UpdateGymInput) => {
      const updated = await apiRequest<Gym>('/gyms/me', { method: 'PATCH', body: input, token });
      setGym(updated);
    },
    [token],
  );

  const linkProfessional = useCallback(
    async (professionalId: string | null) => {
      const updated = await apiRequest<User>('/users/me/professional', {
        method: 'PATCH',
        body: { professionalId },
        token,
      });
      setUser((current) => (current ? { ...current, professionalId: updated.professionalId } : current));
    },
    [token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      user,
      professional,
      gym,
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
      gymSignIn,
      gymSignUp,
      linkProfessional,
      updateUser,
      updateProfessional,
      updateGym,
    }),
    [
      role,
      user,
      professional,
      gym,
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
      gymSignIn,
      gymSignUp,
      linkProfessional,
      updateUser,
      updateProfessional,
      updateGym,
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
