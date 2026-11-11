import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { CheckInCard } from '@/components/check-in-card';
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
import { useCheckIn } from '@/hooks/use-check-in';
import { useTodayWorkout } from '@/hooks/use-today-workout';
import { useWorkoutSessions } from '@/hooks/use-workout-sessions';
import { WEEKDAY_LABELS } from '@/types/workout';
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
  const { trainedDays } = useWorkoutSessions(currentMonth, undefined, refreshKey);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isSelectModalVisible, setIsSelectModalVisible] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const currentProfessional = useMemo(
    () => professionals.find((professional) => professional.id === user?.professionalId) ?? null,
    [professionals, user?.professionalId],
  );

  // Treino do dia (o seguinte ao ultimo concluido). Depois de concluir, mostra
  // o proximo, mas so libera amanha.
  const { next: nextWorkout, trainedToday, reload: reloadToday } = useTodayWorkout(plan);
  // Aluno matriculado: check-in aprovado pela academia antes de treinar.
  const checkIn = useCheckIn();
  const { reload: reloadCheckIn } = checkIn;

  useFocusEffect(
    useCallback(() => {
      reloadPlan();
      reloadToday();
      reloadCheckIn();
      setRefreshKey((key) => key + 1);
    }, [reloadPlan, reloadToday, reloadCheckIn]),
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
        {checkIn.today?.required && nextWorkout?.isToday && (
          <CheckInCard
            today={checkIn.today}
            isSubmitting={checkIn.isSubmitting}
            error={checkIn.error}
            onRequest={checkIn.requestCheckIn}
            onCancel={checkIn.cancelCheckIn}
          />
        )}

        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <ThemedText type="small" themeColor="textSecondary">
            {!nextWorkout
              ? 'Pronto para treinar?'
              : nextWorkout.isToday
                ? 'Treino de hoje'
                : trainedToday
                  ? 'Treino de hoje concluído · próximo treino'
                  : 'Hoje é dia de descanso · próximo treino'}
          </ThemedText>
          {nextWorkout ? (
            <>
              <ThemedText style={styles.heroTitle}>{WEEKDAY_LABELS[nextWorkout.day.dayOfWeek]}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {nextWorkout.day.entries.length}{' '}
                {nextWorkout.day.entries.length === 1 ? 'exercício' : 'exercícios'} ·{' '}
                {[...new Set(nextWorkout.day.entries.map((entry) => entry.exercise.muscleGroup))].join(', ')}
              </ThemedText>
              <PrimaryButton
                label={
                  !nextWorkout.isToday
                    ? `Disponível ${nextWorkout.when}`
                    : checkIn.canTrain
                      ? 'Iniciar treino'
                      : 'Faça o check-in para iniciar'
                }
                disabled={!nextWorkout.isToday || !checkIn.canTrain}
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
                ? 'Sua ficha ainda está vazia. Monte seu treino na aba Treinos ou peça ao seu profissional.'
                : 'Sua ficha ainda está vazia. Monte seu treino na aba Treinos.'}
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
    // Preenche a altura da linha: os dois cards da mesma linha ficam iguais,
    // mesmo quando a descricao de um quebra em duas linhas.
    flexGrow: 1,
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
