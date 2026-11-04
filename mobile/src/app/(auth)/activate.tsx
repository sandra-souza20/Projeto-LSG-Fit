import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthCard } from '@/components/auth-card';
import { AuthScreen } from '@/components/auth-screen';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

// Primeiro acesso do profissional: a academia o cadastra no app web e ele
// recebe um codigo por e-mail para criar a senha.
export default function ActivateAccountScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const { activateAccount, requestPasswordReset } = useAuth();

  const [email, setEmail] = useState(emailParam ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit() {
    setError(null);
    setInfo(null);

    if (!email || !code || !password || !confirmPassword) {
      setError('Preencha todos os campos para continuar.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await activateAccount({ email: email.trim(), code: code.trim(), password, confirmPassword });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ativar sua conta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Para profissional ainda nao ativado, o forgot-password reenvia o codigo de convite.
  async function handleResend() {
    setError(null);
    setInfo(null);

    if (!email) {
      setError('Informe o e-mail para reenviar o código.');
      return;
    }

    setIsResending(true);
    try {
      await requestPasswordReset({ email: email.trim() });
      setInfo('Se o e-mail estiver cadastrado, enviamos um novo código.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível reenviar o código.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthScreen>
      <AuthCard
        title="Ativar conta"
        subtitle="Digite o código que a academia enviou para o seu e-mail e crie sua senha"
        footer={
          <View style={styles.footer}>
            <Pressable hitSlop={8} onPress={handleResend} disabled={isResending}>
              <ThemedText type="link" themeColor="accent">
                {isResending ? 'Reenviando...' : 'Reenviar código'}
              </ThemedText>
            </Pressable>

            <Pressable hitSlop={8} onPress={() => router.push('/')}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                Já ativou a conta?{' '}
                <ThemedText type="link" themeColor="accent">
                  Entrar
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
        <TextField
          label="Código"
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />
        <TextField label="Nova senha" placeholder="••••••••" isPassword value={password} onChangeText={setPassword} />
        <TextField
          label="Confirmar senha"
          placeholder="••••••••"
          isPassword
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {info && (
          <ThemedText type="small" themeColor="accent">
            {info}
          </ThemedText>
        )}

        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}

        <PrimaryButton label="Ativar conta" isLoading={isSubmitting} onPress={handleSubmit} />
      </AuthCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: Spacing.three,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
});
