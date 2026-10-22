import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ConfirmLogoutModal } from '@/components/confirm-logout-modal';
import { ConfirmModal } from '@/components/confirm-modal';
import { EditProfileModal, type ProfileField } from '@/components/edit-profile-modal';
import { GymStudentsTab, type GymStudent } from '@/components/gym/gym-students-tab';
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

type Tab = 'professionals' | 'students' | 'profile';

type GymProfessional = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  // Relacao "Contrata": PENDING e um pedido de vinculo esperando aprovacao.
  gymStatus: 'PENDING' | 'ACTIVE' | null;
  studentsCount: number;
};

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'professionals', label: 'Profissionais' },
  { value: 'students', label: 'Alunos' },
  { value: 'profile', label: 'Perfil' },
];

const PROFILE_FIELDS: ProfileField[] = [
  { key: 'name', label: 'Nome da academia', required: true },
  { key: 'phone', label: 'WhatsApp / telefone', placeholder: '(15) 3333-3333', keyboardType: 'phone-pad' },
  { key: 'address', label: 'Endereço', placeholder: 'Rua, número, bairro, cidade' },
];

// Inicio e fim do mes atual no fuso do aparelho, para contar os treinos do mes.
function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

// Area da academia (ator "Academia" do DER): acompanha os profissionais
// vinculados (Contrata), os alunos matriculados (Matricula) e os dados da academia.
export default function GymHomeScreen() {
  const theme = useTheme();
  const { gym, token, updateGym, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('professionals');
  const [professionals, setProfessionals] = useState<GymProfessional[]>([]);
  const [students, setStudents] = useState<GymStudent[]>([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [professionalToRemove, setProfessionalToRemove] = useState<GymProfessional | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const [professionalsResult, studentsResult] = await Promise.all([
        apiRequest<GymProfessional[]>('/gyms/me/professionals', { token }),
        apiRequest<GymStudent[]>(`/gyms/me/students?${currentMonthRange()}`, { token }),
      ]);
      setProfessionals(professionalsResult);
      setStudents(studentsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados da academia.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingProfessionals = professionals.filter((professional) => professional.gymStatus === 'PENDING');
  const activeProfessionals = professionals.filter((professional) => professional.gymStatus !== 'PENDING');

  async function handleApproveProfessional(professional: GymProfessional) {
    if (!token) return;

    setApprovingId(professional.id);
    setActionError(null);
    try {
      await apiRequest<void>(`/gyms/me/professionals/${professional.id}/approve`, { method: 'PATCH', token });
      setProfessionals((current) =>
        current.map((item) => (item.id === professional.id ? { ...item, gymStatus: 'ACTIVE' } : item)),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível aprovar o profissional.');
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRemoveProfessional() {
    if (!professionalToRemove || !token) return;

    setIsRemoving(true);
    setRemoveError(null);
    try {
      await apiRequest<void>(`/gyms/me/professionals/${professionalToRemove.id}`, { method: 'DELETE', token });
      setProfessionals((current) => current.filter((item) => item.id !== professionalToRemove.id));
      setProfessionalToRemove(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Não foi possível remover o profissional.');
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <>
      <Screen header={<AppHeader name={gym?.name ?? ''} onLogout={() => setIsLogoutModalVisible(true)} />}>
        <View style={styles.statsRow}>
          <ThemedView type="backgroundElement" style={styles.stat}>
            <ThemedText style={styles.statValue} themeColor="accent">
              {activeProfessionals.length}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Profissionais
            </ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.stat}>
            <ThemedText style={styles.statValue} themeColor="accent">
              {students.length}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Alunos matriculados
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
                &quot;Meu perfil&quot;, e o pedido aparece aqui para você aprovar.
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              {actionError && (
                <ThemedText type="small" themeColor="danger">
                  {actionError}
                </ThemedText>
              )}

              {pendingProfessionals.length > 0 && (
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  Pedidos de vínculo ({pendingProfessionals.length})
                </ThemedText>
              )}
              {pendingProfessionals.map((professional) => (
                <ThemedView key={professional.id} type="card" style={[styles.card, { borderColor: theme.accent }]}>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{professional.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {professional.specialty ?? 'Personal trainer'} · {professional.email}
                    </ThemedText>
                  </View>
                  <View style={styles.rowBetween}>
                    <Pressable
                      disabled={approvingId !== null}
                      onPress={() => handleApproveProfessional(professional)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        { backgroundColor: theme.accent },
                        pressed && styles.pressed,
                      ]}>
                      {approvingId === professional.id ? (
                        <ActivityIndicator color={theme.accentText} />
                      ) : (
                        <ThemedText type="smallBold" themeColor="accentText">
                          Aprovar
                        </ThemedText>
                      )}
                    </Pressable>
                    <Pressable
                      disabled={approvingId !== null}
                      onPress={() => {
                        setRemoveError(null);
                        setProfessionalToRemove(professional);
                      }}
                      style={({ pressed }) => [
                        styles.actionButton,
                        { borderColor: theme.border, borderWidth: 1 },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="smallBold" themeColor="danger">
                        Recusar
                      </ThemedText>
                    </Pressable>
                  </View>
                </ThemedView>
              ))}

              {pendingProfessionals.length > 0 && activeProfessionals.length > 0 && (
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  Equipe
                </ThemedText>
              )}
              {activeProfessionals.map((professional) => (
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
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      setRemoveError(null);
                      setProfessionalToRemove(professional);
                    }}>
                    <ThemedText type="small" themeColor="danger">
                      Remover da equipe
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              ))}
            </>
          )
        ) : tab === 'students' ? (
          isLoading ? (
            <ActivityIndicator color={theme.accent} style={styles.loading} />
          ) : (
            <GymStudentsTab
              students={students}
              onStudentRemoved={(studentId) =>
                setStudents((current) => current.filter((student) => student.id !== studentId))
              }
            />
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

      <ConfirmModal
        visible={professionalToRemove !== null}
        title={professionalToRemove?.gymStatus === 'PENDING' ? 'Recusar pedido' : 'Remover da equipe'}
        message={
          professionalToRemove?.gymStatus === 'PENDING'
            ? `${professionalToRemove.name} não será vinculado à academia.`
            : `${professionalToRemove?.name ?? 'O profissional'} deixará de aparecer como profissional da academia. Os alunos dele continuam com ele.`
        }
        confirmLabel={professionalToRemove?.gymStatus === 'PENDING' ? 'Recusar' : 'Remover'}
        isSubmitting={isRemoving}
        error={removeError}
        onCancel={() => setProfessionalToRemove(null)}
        onConfirm={handleRemoveProfessional}
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
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButton: {
    flex: 1,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
