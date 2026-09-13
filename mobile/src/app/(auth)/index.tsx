import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthCard } from '@/components/auth-card';
import { AuthScreen } from '@/components/auth-screen';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';

type LoginMode = 'student' | 'professional';

export default function LoginScreen() {
  const { signIn, professionalSignIn } = useAuth();
  const theme = useTheme();
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
            onPress={() => router.push(mode === 'professional' ? '/professional-register' : '/register')}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
              Não tem uma conta?{' '}
              <ThemedText type="link" themeColor="accent">
                Cadastre-se
              </ThemedText>
            </ThemedText>
          </Pressable>
        }>
        <View style={[styles.modeSwitch, { borderColor: theme.border }]}>
          <Pressable style={styles.modeButtonTouchable} onPress={() => setMode('student')}>
            <ThemedView type={mode === 'student' ? 'accent' : 'background'} style={styles.modeButtonInner}>
              <ThemedText type="smallBold" themeColor={mode === 'student' ? 'accentText' : 'textSecondary'}>
                Aluno
              </ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable style={styles.modeButtonTouchable} onPress={() => setMode('professional')}>
            <ThemedView type={mode === 'professional' ? 'accent' : 'background'} style={styles.modeButtonInner}>
              <ThemedText type="smallBold" themeColor={mode === 'professional' ? 'accentText' : 'textSecondary'}>
                Profissional
              </ThemedText>
            </ThemedView>
          </Pressable>
        </View>

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
  modeSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.pill,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  modeButtonTouchable: {
    flex: 1,
  },
  modeButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
