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
// recebe um link por e-mail para criar a senha (na pagina web). Aqui so
// explicamos isso e permitimos reenviar o convite.
export default function ActivateAccountScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState(emailParam ?? '');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Para profissional ainda nao ativado, o forgot-password reenvia o convite.
  async function handleResend() {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError('Informe o e-mail para reenviar o convite.');
      return;
    }

    setIsResending(true);
    try {
      await requestPasswordReset({ email: email.trim() });
      setInfo('Se o e-mail estiver cadastrado, enviamos um novo link de convite.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível reenviar o convite.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthScreen>
      <AuthCard
        title="Ativar conta"
        subtitle="Abra o link que a academia enviou para o seu e-mail e crie sua senha. Depois, volte aqui e entre."
        footer={
          <View style={styles.footer}>
            <Pressable hitSlop={8} onPress={() => router.push('/')}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                Já criou a senha?{' '}
                <ThemedText type="link" themeColor="accent">
                  Entrar
                </ThemedText>
              </ThemedText>
            </Pressable>
          </View>
        }>
        <ThemedText type="small" themeColor="textSecondary">
          Não recebeu ou o link expirou? Informe seu e-mail para receber um novo convite.
        </ThemedText>

        <TextField
          label="E-mail"
          placeholder="seu@email.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
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

        <PrimaryButton label="Reenviar convite" isLoading={isResending} onPress={handleResend} />
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
