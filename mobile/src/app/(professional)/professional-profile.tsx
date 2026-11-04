import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmLogoutModal } from '@/components/confirm-logout-modal';
import { InfoRow } from '@/components/info-row';
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
  const router = useRouter();
  const { user, updateUser, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [specialty, setSpecialty] = useState(user?.specialty ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
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
      await updateUser({
        name: name.trim(),
        phone: phone.trim() || null,
        specialty: specialty.trim() || null,
        bio: bio.trim() || null,
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
          <TextField label="E-mail" value={user?.email ?? ''} editable={false} />
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

        {/* A academia cadastra o profissional no app web; aqui o vinculo e so informativo. */}
        <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
          <InfoRow label="Academia" value={user?.gym?.name} placeholder="Nenhuma" />
          <ThemedText type="small" themeColor="textSecondary">
            A academia que cadastrou você é quem gerencia esse vínculo.
          </ThemedText>
        </ThemedView>

        <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
          <ThemeToggleRow />
        </ThemedView>

        <Pressable onPress={() => router.push('/devices')}>
          <ThemedView type="card" style={[styles.card, styles.linkRow, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Dispositivos conectados</ThemedText>
            <ThemedText type="link" themeColor="accent">
              Ver
            </ThemedText>
          </ThemedView>
        </Pressable>

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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
