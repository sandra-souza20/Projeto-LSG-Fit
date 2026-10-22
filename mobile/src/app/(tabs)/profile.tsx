import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmLogoutModal } from '@/components/confirm-logout-modal';
import { EditProfileModal, type ProfileField } from '@/components/edit-profile-modal';
import { FrequencyCalendar } from '@/components/frequency-calendar';
import { GymPicker } from '@/components/gym-picker';
import { InfoRow } from '@/components/info-row';
import { Screen } from '@/components/screen';
import { ThemeToggleRow } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { usePhysicalAssessments } from '@/hooks/use-physical-assessments';
import { useProfessionals } from '@/hooks/use-professionals';
import { useTheme } from '@/hooks/use-theme';
import { formatDecimal, formatPhone } from '@/utils/contact';

const PROFILE_FIELDS: ProfileField[] = [
  { key: 'name', label: 'Nome completo', required: true },
  { key: 'phone', label: 'Telefone', placeholder: '(15) 99999-9999', keyboardType: 'phone-pad' },
];

// RF04: frequencia no mes, informacoes pessoais e avaliacoes do aluno.
export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, updateUser, linkGym, signOut } = useAuth();
  const { professionals } = useProfessionals();
  const { assessments, reload: reloadAssessments } = usePhysicalAssessments();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isChangingGym, setIsChangingGym] = useState(false);
  const [isSavingGym, setIsSavingGym] = useState(false);
  const [gymError, setGymError] = useState<string | null>(null);

  async function handleGymChange(gymId: string | null) {
    if (gymId === (user?.gymId ?? null)) {
      setIsChangingGym(false);
      return;
    }

    setIsSavingGym(true);
    setGymError(null);
    try {
      await linkGym(gymId);
      setIsChangingGym(false);
    } catch (err) {
      setGymError(err instanceof Error ? err.message : 'Não foi possível alterar a academia.');
    } finally {
      setIsSavingGym(false);
    }
  }

  const professionalName = useMemo(
    () => professionals.find((professional) => professional.id === user?.professionalId)?.name ?? null,
    [professionals, user?.professionalId],
  );

  useFocusEffect(
    useCallback(() => {
      reloadAssessments();
      setRefreshKey((key) => key + 1);
    }, [reloadAssessments]),
  );

  const latest = assessments[0];
  const previous = assessments[1];
  const weightDiff = latest && previous ? latest.weight - previous.weight : null;

  return (
    <>
      <Screen title="Perfil" withTabBar>
        <View style={styles.identity}>
          <ThemedView type="accent" style={styles.avatar}>
            <ThemedText style={styles.avatarText} themeColor="accentText">
              {(user?.name ?? '?').trim().charAt(0).toUpperCase()}
            </ThemedText>
          </ThemedView>
          <View style={styles.flex}>
            <ThemedText type="smallBold" style={styles.name}>
              {user?.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Aluno desde {user ? new Date(user.createdAt).toLocaleDateString('pt-BR') : ''}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Frequência
        </ThemedText>
        <FrequencyCalendar refreshKey={refreshKey} />

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Informações pessoais
          </ThemedText>
          <Pressable hitSlop={8} onPress={() => setIsEditing(true)}>
            <ThemedText type="link" themeColor="accent">
              Editar
            </ThemedText>
          </Pressable>
        </View>
        <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
          <InfoRow label="Nome" value={user?.name} />
          <InfoRow label="E-mail" value={user?.email} />
          <InfoRow label="Telefone" value={user?.phone ? formatPhone(user.phone) : null} />
          <InfoRow label="Profissional" value={professionalName} placeholder="Nenhum vinculado" />
        </ThemedView>

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Academia
          </ThemedText>
          <Pressable
            hitSlop={8}
            onPress={() => {
              setGymError(null);
              setIsChangingGym((value) => !value);
            }}>
            <ThemedText type="link" themeColor="accent">
              {isChangingGym ? 'Cancelar' : user?.gymId ? 'Trocar' : 'Escolher'}
            </ThemedText>
          </Pressable>
        </View>
        <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
          {isChangingGym ? (
            <GymPicker
              value={user?.gymId ?? null}
              onChange={handleGymChange}
              noneLabel="Nenhuma"
              hint="Toque na academia em que você treina."
              disabled={isSavingGym}
            />
          ) : user?.gym ? (
            <>
              <InfoRow label="Academia" value={user.gym.name} />
              <InfoRow
                label="Matriculado desde"
                value={user.gymEnrolledAt ? new Date(user.gymEnrolledAt).toLocaleDateString('pt-BR') : null}
              />
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Você ainda não informou a academia em que treina.
            </ThemedText>
          )}
          {gymError && (
            <ThemedText type="small" themeColor="danger">
              {gymError}
            </ThemedText>
          )}
        </ThemedView>

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Avaliações
          </ThemedText>
          <Pressable hitSlop={8} onPress={() => router.push('/physical-assessments')}>
            <ThemedText type="link" themeColor="accent">
              Ver histórico
            </ThemedText>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/physical-assessments')}>
          <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
            {latest ? (
              <>
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <ThemedText style={styles.statValue}>{formatDecimal(latest.weight)}kg</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Peso atual
                    </ThemedText>
                  </View>
                  {weightDiff !== null && (
                    <View style={styles.stat}>
                      <ThemedText style={styles.statValue} themeColor="accent">
                        {weightDiff > 0 ? '+' : ''}
                        {formatDecimal(Math.round(weightDiff * 10) / 10)}kg
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Desde a anterior
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.stat}>
                    <ThemedText style={styles.statValue}>{assessments.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {assessments.length === 1 ? 'Avaliação' : 'Avaliações'}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Última em {new Date(latest.createdAt).toLocaleDateString('pt-BR')}
                </ThemedText>
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhuma avaliação registrada ainda. Toque para registrar a primeira.
              </ThemedText>
            )}
          </ThemedView>
        </Pressable>

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Preferências
        </ThemedText>
        <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
          <ThemeToggleRow />
        </ThemedView>

        <Pressable
          onPress={() => setIsLogoutModalVisible(true)}
          style={({ pressed }) => [styles.logout, { borderColor: theme.danger }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="danger">
            Sair da conta
          </ThemedText>
        </Pressable>
      </Screen>

      <EditProfileModal
        visible={isEditing}
        title="Editar informações"
        fields={PROFILE_FIELDS}
        initialValues={{ name: user?.name ?? '', phone: user?.phone ?? '' }}
        onClose={() => setIsEditing(false)}
        onSave={(values) => updateUser({ name: values.name, phone: values.phone || null })}
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
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  flex: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    lineHeight: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
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
