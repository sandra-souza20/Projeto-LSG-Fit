import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AuthCard } from '@/components/auth-card';
import { AuthScreen } from '@/components/auth-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { ApiError } from '@/services/api';

type LoginMode = 'student' | 'professional' | 'gym';

const REGISTER_ROUTES = {
  student: '/register',
  professional: '/professional-register',
  gym: '/gym-register',
} as const;

const MODE_OPTIONS: { value: LoginMode; label: string }[] = [
  { value: 'student', label: 'Aluno' },
  { value: 'professional', label: 'Profissional' },
  { value: 'gym', label: 'Academia' },
];

export default function LoginScreen() {
  const { signIn, professionalSignIn, gymSignIn } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!email || !password) {
      setError('Preencha e-mail e senha para continuar.');
      return;
    }

    const trimmedEmail = email.trim();

    setIsSubmitting(true);
    try {
      if (mode === 'professional') {
        await professionalSignIn({ email: trimmedEmail, password });
      } else if (mode === 'gym') {
        await gymSignIn({ email: trimmedEmail, password });
      } else {
        await signIn({ email: trimmedEmail, password });
      }
    } catch (err) {
      if (mode === 'student' && err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        router.push({ pathname: '/verify-email', params: { email: trimmedEmail } });
        return;
      }
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthCard
        title="Entrar"
        subtitle="Faça login na sua conta para continuar"
        footer={
          <Pressable
            hitSlop={8}
            onPress={() => router.push(REGISTER_ROUTES[mode])}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
              Não tem uma conta?{' '}
              <ThemedText type="link" themeColor="accent">
                Cadastre-se
              </ThemedText>
            </ThemedText>
          </Pressable>
        }>
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

        <TextField
          label="E-mail"
          placeholder="seu@email.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField label="Senha" placeholder="••••••••" isPassword value={password} onChangeText={setPassword} />

        {mode === 'student' && (
          <Pressable hitSlop={8} onPress={() => router.push('/forgot-password')}>
            <ThemedText type="link" themeColor="accent" style={styles.forgotPassword}>
              Esqueceu a senha?
            </ThemedText>
          </Pressable>
        )}

        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}

        <PrimaryButton label="Entrar" isLoading={isSubmitting} onPress={handleSubmit} />
      </AuthCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgotPassword: {
    textAlign: 'right',
  },
  footerText: {
    textAlign: 'center',
  },
});
