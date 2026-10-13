import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AuthCard } from '@/components/auth-card';
import { AuthScreen } from '@/components/auth-screen';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';

// RF01: a tela de cadastro e diferente para aluno, profissional e academia.
export default function GymRegisterScreen() {
  const { gymSignUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError('Preencha nome, e-mail e senha para continuar.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await gymSignUp({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        password,
        confirmPassword,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar a academia.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthCard
        title="Cadastrar academia"
        subtitle="Reúna seus profissionais e alunos no LSG FIT"
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
        <TextField
          label="Nome da academia"
          placeholder="Ex: Academia Fernando Prestes"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />
        <TextField
          label="E-mail"
          placeholder="contato@academia.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label="WhatsApp / telefone (opcional)"
          placeholder="(15) 3333-3333"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextField
          label="Endereço (opcional)"
          placeholder="Rua, número, bairro, cidade"
          autoCapitalize="sentences"
          value={address}
          onChangeText={setAddress}
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

        <PrimaryButton label="Cadastrar academia" isLoading={isSubmitting} onPress={handleSubmit} />
      </AuthCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footerText: {
    textAlign: 'center',
  },
});
