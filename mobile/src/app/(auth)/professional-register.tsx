import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AuthCard } from '@/components/auth-card';
import { AuthScreen } from '@/components/auth-screen';
import { GymPicker } from '@/components/gym-picker';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';

export default function ProfessionalRegisterScreen() {
  const { professionalSignUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [gymId, setGymId] = useState<string | null>(null);
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

    setIsSubmitting(true);
    try {
      await professionalSignUp({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        phone: phone.trim(),
        specialty: specialty.trim(),
        gymId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar sua conta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthCard
        title="Criar conta de profissional"
        subtitle="Preencha os dados para acompanhar seus alunos"
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
        <TextField
          label="WhatsApp / telefone (opcional)"
          placeholder="(15) 99999-9999"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextField
          label="Especialidade (opcional)"
          placeholder="Ex: Hipertrofia, emagrecimento"
          autoCapitalize="sentences"
          value={specialty}
          onChangeText={setSpecialty}
        />
        <GymPicker
          value={gymId}
          onChange={setGymId}
          hint="Se você trabalha numa academia, ela precisa aprovar o vínculo."
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
