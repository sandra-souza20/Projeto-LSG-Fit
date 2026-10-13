import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ConfirmLogoutModal } from '@/components/confirm-logout-modal';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SelectProfessionalModal } from '@/components/select-professional-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProfessionals, type ProfessionalSummary } from '@/hooks/use-professionals';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutPlan } from '@/hooks/use-workout-plan';
import { useWorkoutSessions } from '@/hooks/use-workout-sessions';
import { WORKOUT_LETTERS } from '@/types/workout';
import { openWhatsApp } from '@/utils/contact';

type Shortcut = { label: string; description: string; href: Href; highlight?: boolean };

// RF02: atalhos para treino, perfil e contato.
const SHORTCUTS: Shortcut[] = [
  { label: 'Treino', description: 'Sua ficha e execução', href: '/workouts', highlight: true },
  { label: 'Perfil', description: 'Frequência e avaliações', href: '/profile' },
  { label: 'Contato', description: 'Fale com profissionais', href: '/professionals' },
];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut, linkProfessional } = useAuth();
  const { professionals } = useProfessionals();
  const { plan, reload: reloadPlan } = useWorkoutPlan();
  const [currentMonth] = useState(() => new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const { sessions, trainedDays } = useWorkoutSessions(currentMonth, undefined, refreshKey);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isSelectModalVisible, setIsSelectModalVisible] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const currentProfessional = useMemo(
    () => professionals.find((professional) => professional.id === user?.professionalId) ?? null,
    [professionals, user?.professionalId],
  );

  const activeDays = useMemo(() => plan.filter((day) => day.entries.length > 0), [plan]);

  // Sugere o treino seguinte ao ultimo concluido (A -> B -> C -> A...).
  const nextWorkout = useMemo(() => {
    if (activeDays.length === 0) return null;
    const lastSession = sessions[sessions.length - 1];
    const lastIndex = lastSession ? activeDays.findIndex((day) => day.dayOfWeek === lastSession.dayOfWeek) : -1;
    const index = (lastIndex + 1) % activeDays.length;
    return { day: activeDays[index]!, letter: WORKOUT_LETTERS[index]! };
  }, [activeDays, sessions]);

  useFocusEffect(
    useCallback(() => {
      reloadPlan();
      setRefreshKey((key) => key + 1);
    }, [reloadPlan]),
  );

  async function handleSelectProfessional(professional: ProfessionalSummary) {
    setIsLinking(true);
    setLinkError(null);
    try {
      await linkProfessional(professional.id);
      setIsSelectModalVisible(false);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Não foi possível vincular o profissional.');
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <>
      <Screen
        withTabBar
        header={<AppHeader name={user?.name ?? ''} onLogout={() => setIsLogoutModalVisible(true)} />}>
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <ThemedText type="small" themeColor="textSecondary">
            {nextWorkout ? 'Próximo treino' : 'Pronto para treinar?'}
          </ThemedText>
          {nextWorkout ? (
            <>
              <ThemedText style={styles.heroTitle}>Treino {nextWorkout.letter}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {nextWorkout.day.entries.length}{' '}
                {nextWorkout.day.entries.length === 1 ? 'exercício' : 'exercícios'} ·{' '}
                {[...new Set(nextWorkout.day.entries.map((entry) => entry.exercise.muscleGroup))].join(', ')}
              </ThemedText>
              <PrimaryButton
                label="Iniciar treino"
                style={styles.heroButton}
                onPress={() =>
                  router.push({
                    pathname: '/workout-session',
                    params: { day: nextWorkout.day.dayOfWeek, letter: nextWorkout.letter },
                  })
                }
              />
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {user?.professionalId
                ? 'Seu profissional ainda não montou o seu treino. Assim que ele montar, ele aparece aqui.'
                : 'Escolha um profissional para que ele monte o seu treino.'}
            </ThemedText>
          )}
        </ThemedView>

        <View style={styles.grid}>
          {SHORTCUTS.map((shortcut) => (
            <Pressable
              key={shortcut.label}
              onPress={() => router.push(shortcut.href)}
              style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]}>
              <ThemedView
                type={shortcut.highlight ? 'accent' : 'card'}
                style={[styles.shortcut, { borderColor: shortcut.highlight ? theme.accent : theme.border }]}>
                <ThemedText
                  type="smallBold"
                  themeColor={shortcut.highlight ? 'accentText' : 'text'}
                  style={styles.shortcutLabel}>
                  {shortcut.label}
                </ThemedText>
                <ThemedText type="small" themeColor={shortcut.highlight ? 'accentText' : 'textSecondary'}>
                  {shortcut.description}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.push('/profile')}>
          <ThemedView type="card" style={[styles.card, styles.frequencyRow, { borderColor: theme.border }]}>
            <ThemedText style={styles.frequencyNumber} themeColor="accent">
              {trainedDays.size}
            </ThemedText>
            <View style={styles.flex}>
              <ThemedText type="smallBold">Frequência do mês</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {trainedDays.size === 1 ? 'dia treinado' : 'dias treinados'} em{' '}
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long' })}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" themeColor="accent">
              ›
            </ThemedText>
          </ThemedView>
        </Pressable>

        <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">Seu profissional</ThemedText>
          {currentProfessional ? (
            <>
              <ThemedText>{currentProfessional.name}</ThemedText>
              {currentProfessional.specialty && (
                <ThemedText type="small" themeColor="textSecondary">
                  {currentProfessional.specialty}
                </ThemedText>
              )}
              <View style={styles.actionsRow}>
                {currentProfessional.phone && (
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      openWhatsApp(
                        currentProfessional.phone!,
                        `Olá, ${currentProfessional.name}! Sou seu aluno no LSG FIT.`,
                      )
                    }>
                    <ThemedText type="link" themeColor="accent">
                      Conversar no WhatsApp
                    </ThemedText>
                  </Pressable>
                )}
                <Pressable hitSlop={8} onPress={() => setIsSelectModalVisible(true)}>
                  <ThemedText type="link" themeColor="textSecondary">
                    Trocar profissional
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Você ainda não tem um profissional vinculado. Escolha um para que ele possa montar o seu treino.
              </ThemedText>
              <Pressable hitSlop={8} onPress={() => setIsSelectModalVisible(true)}>
                <ThemedText type="link" themeColor="accent">
                  Escolher profissional
                </ThemedText>
              </Pressable>
            </>
          )}
        </ThemedView>
      </Screen>

      <ConfirmLogoutModal
        visible={isLogoutModalVisible}
        onCancel={() => setIsLogoutModalVisible(false)}
        onConfirm={() => {
          setIsLogoutModalVisible(false);
          signOut();
        }}
      />

      <SelectProfessionalModal
        visible={isSelectModalVisible}
        isSubmitting={isLinking}
        serverError={linkError}
        onClose={() => {
          setIsSelectModalVisible(false);
          setLinkError(null);
        }}
        onSelect={handleSelectProfessional}
      />
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  heroButton: {
    marginTop: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  gridItem: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  shortcut: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    minHeight: 92,
    justifyContent: 'flex-end',
    gap: Spacing.half,
  },
  shortcutLabel: {
    fontSize: 18,
    lineHeight: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  frequencyNumber: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  flex: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
});
