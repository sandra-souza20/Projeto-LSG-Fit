import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmLogoutModal } from '@/components/confirm-logout-modal';
import { GymPicker } from '@/components/gym-picker';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemeToggleRow } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';

// Os dados preenchidos aqui sao os que o aluno ve na Pagina de Perfis (RF05).
export default function ProfessionalProfileScreen() {
  const theme = useTheme();
  const { professional, updateProfessional, signOut } = useAuth();
  const [name, setName] = useState(professional?.name ?? '');
  const [phone, setPhone] = useState(professional?.phone ?? '');
  const [specialty, setSpecialty] = useState(professional?.specialty ?? '');
  const [bio, setBio] = useState(professional?.bio ?? '');
  const [gymId, setGymId] = useState<string | null>(professional?.gymId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  // Esconde o aviso de "salvo" depois de alguns segundos.
  useEffect(() => {
    if (!savedAt) return;
    const timeout = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(timeout);
  }, [savedAt]);

  async function handleSave() {
    if (!name.trim()) {
      setError('Informe o seu nome.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updateProfessional({
        name: name.trim(),
        phone: phone.trim() || null,
        specialty: specialty.trim() || null,
        bio: bio.trim() || null,
        gymId,
      });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Screen title="Meu perfil" backLabel="Meus alunos">
        <ThemedText type="small" themeColor="textSecondary">
          Essas informações aparecem para os alunos na página de profissionais. Com o telefone preenchido, eles
          podem te chamar direto no WhatsApp.
        </ThemedText>

        <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
          <TextField label="Nome" autoCapitalize="words" value={name} onChangeText={setName} />
          <TextField label="E-mail" value={professional?.email ?? ''} editable={false} />
          <TextField
            label="WhatsApp / telefone"
            placeholder="(15) 99999-9999"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextField
            label="Especialidade"
            placeholder="Ex: Hipertrofia, emagrecimento, funcional"
            autoCapitalize="sentences"
            value={specialty}
            onChangeText={setSpecialty}
          />
          <TextField
            label="Sobre você"
            placeholder="Formação, experiência, como você trabalha..."
            autoCapitalize="sentences"
            multiline
            style={styles.multiline}
            value={bio}
            onChangeText={setBio}
          />
          <GymPicker value={gymId} onChange={setGymId} />

          {error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}
          {savedAt && (
            <ThemedText type="small" themeColor="accent">
              Perfil salvo!
            </ThemedText>
          )}

          <PrimaryButton label="Salvar perfil" isLoading={isSubmitting} onPress={handleSave} />
        </ThemedView>

        <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
          <ThemeToggleRow />
        </ThemedView>

        <View>
          <Pressable
            onPress={() => setIsLogoutModalVisible(true)}
            style={({ pressed }) => [styles.logout, { borderColor: theme.danger }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="danger">
              Sair da conta
            </ThemedText>
          </Pressable>
        </View>
      </Screen>

      <ConfirmLogoutModal
        visible={isLogoutModalVisible}
        onCancel={() => setIsLogoutModalVisible(false)}
        onConfirm={() => {
          setIsLogoutModalVisible(false);
          signOut();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  logout: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
