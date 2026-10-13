import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ConfirmLogoutModal } from '@/components/confirm-logout-modal';
import { EditProfileModal, type ProfileField } from '@/components/edit-profile-modal';
import { InfoRow } from '@/components/info-row';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemeToggleRow } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { apiRequest } from '@/services/api';
import { formatPhone, openWhatsApp } from '@/utils/contact';

type Tab = 'professionals' | 'profile';

type GymProfessional = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  studentsCount: number;
};

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'professionals', label: 'Profissionais' },
  { value: 'profile', label: 'Perfil' },
];

const PROFILE_FIELDS: ProfileField[] = [
  { key: 'name', label: 'Nome da academia', required: true },
  { key: 'phone', label: 'WhatsApp / telefone', placeholder: '(15) 3333-3333', keyboardType: 'phone-pad' },
  { key: 'address', label: 'Endereço', placeholder: 'Rua, número, bairro, cidade' },
];

// Area da academia (ator "Academia" do DER): acompanha os profissionais
// vinculados e mantem os dados de contato da academia.
export default function GymHomeScreen() {
  const theme = useTheme();
  const { gym, token, updateGym, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('professionals');
  const [professionals, setProfessionals] = useState<GymProfessional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      setProfessionals(await apiRequest<GymProfessional[]>('/gyms/me/professionals', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados da academia.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const totalStudents = professionals.reduce((sum, professional) => sum + professional.studentsCount, 0);

  return (
    <>
      <Screen header={<AppHeader name={gym?.name ?? ''} onLogout={() => setIsLogoutModalVisible(true)} />}>
        <View style={styles.statsRow}>
          <ThemedView type="backgroundElement" style={styles.stat}>
            <ThemedText style={styles.statValue} themeColor="accent">
              {professionals.length}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Profissionais
            </ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.stat}>
            <ThemedText style={styles.statValue} themeColor="accent">
              {totalStudents}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Alunos
            </ThemedText>
          </ThemedView>
        </View>

        <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />

        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}

        {tab === 'professionals' ? (
          isLoading ? (
            <ActivityIndicator color={theme.accent} style={styles.loading} />
          ) : professionals.length === 0 ? (
            <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                Nenhum profissional vinculado ainda. Os profissionais escolhem a academia no cadastro ou em
                &quot;Meu perfil&quot;.
              </ThemedText>
            </ThemedView>
          ) : (
            professionals.map((professional) => (
              <ThemedView key={professional.id} type="card" style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.rowBetween}>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{professional.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {professional.specialty ?? 'Personal trainer'} · {professional.studentsCount}{' '}
                      {professional.studentsCount === 1 ? 'aluno' : 'alunos'}
                    </ThemedText>
                  </View>
                  {professional.phone && (
                    <Pressable hitSlop={8} onPress={() => openWhatsApp(professional.phone!)}>
                      <ThemedText type="link" themeColor="accent">
                        WhatsApp
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              </ThemedView>
            ))
          )
        ) : (
          <>
            <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
              <InfoRow label="Nome" value={gym?.name} />
              <InfoRow label="E-mail" value={gym?.email} />
              <InfoRow label="Telefone" value={gym?.phone ? formatPhone(gym.phone) : null} />
              <InfoRow label="Endereço" value={gym?.address} />
              <Pressable hitSlop={8} onPress={() => setIsEditing(true)}>
                <ThemedText type="link" themeColor="accent">
                  Editar dados da academia
                </ThemedText>
              </Pressable>
            </ThemedView>
            <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
              <ThemeToggleRow />
            </ThemedView>
          </>
        )}
      </Screen>

      <EditProfileModal
        visible={isEditing}
        title="Dados da academia"
        fields={PROFILE_FIELDS}
        initialValues={{ name: gym?.name ?? '', phone: gym?.phone ?? '', address: gym?.address ?? '' }}
        onClose={() => setIsEditing(false)}
        onSave={(values) =>
          updateGym({ name: values.name, phone: values.phone || null, address: values.address || null })
        }
      />

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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  loading: {
    marginTop: Spacing.five,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
