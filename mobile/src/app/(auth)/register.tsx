import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AuthCard } from '@/components/auth-card';
import { AuthScreen } from '@/components/auth-screen';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError('Preencha todos os campos para continuar.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    const trimmedEmail = email.trim();

    setIsSubmitting(true);
    try {
      const { needsVerification } = await signUp({
        name: name.trim(),
        email: trimmedEmail,
        password,
        confirmPassword,
      });
      if (needsVerification) {
        router.push({ pathname: '/verify-email', params: { email: trimmedEmail } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar sua conta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthCard
        title="Criar conta"
        subtitle="Preencha os dados para começar"
        footer={
          <Pressable hitSlop={8} onPress={() => router.push('/')}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
              Já tem uma conta?{' '}
              <ThemedText type="link" themeColor="accent">
                Entrar
              </ThemedText>
            </ThemedText>
          </Pressable>
        }>
        <TextField label="Nome completo" placeholder="Seu nome" value={name} onChangeText={setName} />
        <TextField
          label="E-mail"
          placeholder="seu@email.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField label="Senha" placeholder="••••••••" isPassword value={password} onChangeText={setPassword} />
        <TextField
          label="Confirmar senha"
          placeholder="••••••••"
          isPassword
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}

        <PrimaryButton label="Cadastrar" isLoading={isSubmitting} onPress={handleSubmit} />
      </AuthCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footerText: {
    textAlign: 'center',
  },
});
