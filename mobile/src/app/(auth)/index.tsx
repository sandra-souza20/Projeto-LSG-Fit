import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthCard } from '@/components/auth-card';
import { AuthScreen } from '@/components/auth-screen';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ApiError } from '@/services/api';

// Login unico de aluno e profissional: o servidor devolve o papel e o
// layout raiz leva cada um para a sua area.
export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
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
      await signIn({ email: trimmedEmail, password });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        router.push({ pathname: '/verify-email', params: { email: trimmedEmail } });
        return;
      }
      if (err instanceof ApiError && err.code === 'ACCOUNT_NOT_ACTIVATED') {
        router.push({ pathname: '/activate', params: { email: trimmedEmail } });
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
          <View style={styles.footer}>
            <Pressable hitSlop={8} onPress={() => router.push('/register')}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                Não tem uma conta?{' '}
                <ThemedText type="link" themeColor="accent">
                  Cadastre-se
                </ThemedText>
              </ThemedText>
            </Pressable>

            <Pressable
              hitSlop={8}
              onPress={() =>
                router.push(email.trim() ? { pathname: '/activate', params: { email: email.trim() } } : '/activate')
              }>
              <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                Primeiro acesso de profissional?{' '}
                <ThemedText type="link" themeColor="accent">
                  Ative sua conta
                </ThemedText>
              </ThemedText>
            </Pressable>
          </View>
        }>
        <TextField
          label="E-mail"
          placeholder="seu@email.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField label="Senha" placeholder="••••••••" isPassword value={password} onChangeText={setPassword} />

        <Pressable hitSlop={8} onPress={() => router.push('/forgot-password')}>
          <ThemedText type="link" themeColor="accent" style={styles.forgotPassword}>
            Esqueceu a senha?
          </ThemedText>
        </Pressable>

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
  footer: {
    gap: Spacing.three,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
});
