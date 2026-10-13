import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExerciseMedia } from '@/components/workout/exercise-media';
import { RegisterWeightModal } from '@/components/workout/register-weight-modal';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutPlan } from '@/hooks/use-workout-plan';
import { useFinishWorkout } from '@/hooks/use-workout-sessions';
import { formatRest, type Weekday, type WorkoutEntry } from '@/types/workout';
import { formatDecimal } from '@/utils/contact';

// Quando o profissional nao define o descanso, usa um padrao comum de academia.
const DEFAULT_REST_SECONDS = 60;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// RF03: o aluno acompanha o treino exercicio a exercicio (series, repeticoes,
// descanso, carga e demonstracao). Ao finalizar, o treino conta na frequencia (RF04).
export default function WorkoutSessionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { day, letter } = useLocalSearchParams<{ day: Weekday; letter?: string }>();
  const { plan, isLoading, error, registerWeight } = useWorkoutPlan();
  const finishWorkout = useFinishWorkout();

  const [startedAt] = useState(() => Date.now());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rest, setRest] = useState<{ endsAt: number; exerciseName: string } | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [weightEntry, setWeightEntry] = useState<WorkoutEntry | null>(null);
  const [isWeightSubmitting, setIsWeightSubmitting] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const entries = useMemo(() => plan.find((item) => item.dayOfWeek === day)?.entries ?? [], [plan, day]);
  const totalSets = entries.reduce((sum, entry) => sum + entry.sets, 0);
  const doneSets = entries.reduce((sum, entry) => sum + Math.min(completedSets[entry.id] ?? 0, entry.sets), 0);
  const progress = totalSets ? doneSets / totalSets : 0;

  // RNF01: o relogio do treino so atualiza a cada 30s, evitando renderizar
  // a tela toda a cada segundo enquanto o aluno treina.
  useEffect(() => {
    const interval = setInterval(() => setElapsedMinutes(Math.floor((Date.now() - startedAt) / 60000)), 30000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // O cronometro de descanso so roda enquanto existe um descanso ativo.
  useEffect(() => {
    if (!rest) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000));
      setRestRemaining(remaining);
      if (remaining === 0) setRest(null);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [rest]);

  function handleToggleSet(entry: WorkoutEntry, setIndex: number) {
    const done = completedSets[entry.id] ?? 0;
    // Tocar numa serie ja feita desfaz ate ela; tocar na proxima marca como feita.
    const next = setIndex < done ? setIndex : setIndex + 1;
    setCompletedSets((current) => ({ ...current, [entry.id]: next }));

    const isLastSetOfWorkout = doneSets + (next - done) >= totalSets;
    if (next > done && !isLastSetOfWorkout) {
      const seconds = entry.restSeconds ?? DEFAULT_REST_SECONDS;
      setRest({ endsAt: Date.now() + seconds * 1000, exerciseName: entry.exercise.name });
    }
  }

  async function handleConfirmWeight(input: { weight: number | null }) {
    if (!weightEntry) return;
    setIsWeightSubmitting(true);
    setWeightError(null);
    try {
      await registerWeight(weightEntry.id, input.weight);
      setWeightEntry(null);
    } catch (err) {
      setWeightError(err instanceof Error ? err.message : 'Não foi possível salvar a carga.');
    } finally {
      setIsWeightSubmitting(false);
    }
  }

  async function handleFinish() {
    if (!day) return;
    setIsFinishing(true);
    setFinishError(null);
    try {
      await finishWorkout(day);
      setRest(null);
      setIsFinished(true);
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : 'Não foi possível finalizar o treino.');
    } finally {
      setIsFinishing(false);
    }
  }

  const title = `Treino ${letter ?? ''}`.trim();

  if (isFinished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    return (
      <Screen scroll={false}>
        <View style={styles.finished}>
          <ThemedView type="accent" style={styles.finishedBadge}>
            <ThemedText style={styles.finishedCheck} themeColor="accentText">
              ✓
            </ThemedText>
          </ThemedView>
          <ThemedText type="subtitle" style={styles.centerText}>
            {title} concluído!
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            {doneSets} de {totalSets} séries em {minutes} min. O treino já conta na sua frequência do mês.
          </ThemedText>
          <PrimaryButton label="Voltar ao início" style={styles.fullWidth} onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  return (
    <>
      <Screen
        backLabel="Sair do treino"
        header={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <ThemedText type="subtitle">{title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {elapsedMinutes} min
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${progress * 100}%` }]} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {doneSets}/{totalSets} séries concluídas
            </ThemedText>
          </View>
        }>
        {isLoading ? (
          <ActivityIndicator color={theme.accent} style={styles.loading} />
        ) : error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : entries.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Esse treino não possui exercícios.
          </ThemedText>
        ) : (
          <>
            {entries.map((entry, index) => {
              const done = completedSets[entry.id] ?? 0;
              const isComplete = done >= entry.sets;
              const isExpanded = expandedId === entry.id;

              return (
                <ThemedView
                  key={entry.id}
                  type="card"
                  style={[styles.exerciseCard, { borderColor: isComplete ? theme.accent : theme.border }]}>
                  <View style={styles.exerciseHeader}>
                    <ThemedView type={isComplete ? 'accent' : 'backgroundElement'} style={styles.indexBadge}>
                      <ThemedText type="smallBold" themeColor={isComplete ? 'accentText' : 'text'}>
                        {isComplete ? '✓' : index + 1}
                      </ThemedText>
                    </ThemedView>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{entry.exercise.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {entry.exercise.muscleGroup} · {entry.exercise.equipment}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.metrics}>
                    <Metric label="Séries" value={String(entry.sets)} />
                    <Metric label="Repetições" value={String(entry.reps)} />
                    <Metric
                      label="Descanso"
                      value={formatRest(entry.restSeconds ?? DEFAULT_REST_SECONDS)}
                    />
                    <Pressable
                      style={styles.metricPressable}
                      onPress={() => {
                        setWeightError(null);
                        setWeightEntry(entry);
                      }}>
                      <Metric
                        label="Carga ✎"
                        value={entry.weight != null ? `${formatDecimal(entry.weight)}kg` : '—'}
                        accent
                      />
                    </Pressable>
                  </View>

                  <View style={styles.sets}>
                    {Array.from({ length: entry.sets }, (_, setIndex) => {
                      const isDone = setIndex < done;
                      return (
                        <Pressable
                          key={setIndex}
                          onPress={() => handleToggleSet(entry, setIndex)}
                          accessibilityLabel={`Série ${setIndex + 1} ${isDone ? 'concluída' : 'pendente'}`}
                          style={[
                            styles.setChip,
                            {
                              backgroundColor: isDone ? theme.accent : theme.inputBackground,
                              borderColor: isDone ? theme.accent : theme.border,
                            },
                          ]}>
                          <ThemedText type="smallBold" themeColor={isDone ? 'accentText' : 'textSecondary'}>
                            {isDone ? '✓' : `${setIndex + 1}ª`}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable hitSlop={8} onPress={() => setExpandedId(isExpanded ? null : entry.id)}>
                    <ThemedText type="link" themeColor="accent">
                      {isExpanded ? 'Ocultar execução ▴' : 'Ver como executar ▾'}
                    </ThemedText>
                  </Pressable>

                  {/* RNF06: o video so e montado (e baixado) quando o aluno abre a demonstracao. */}
                  {isExpanded && (
                    <Animated.View entering={FadeIn.duration(150)}>
                      <ExerciseMedia exercise={entry.exercise} />
                    </Animated.View>
                  )}
                </ThemedView>
              );
            })}

            {finishError && (
              <ThemedText type="small" themeColor="danger">
                {finishError}
              </ThemedText>
            )}
            <PrimaryButton
              label={doneSets >= totalSets ? 'Finalizar treino' : `Finalizar treino (${doneSets}/${totalSets})`}
              isLoading={isFinishing}
              onPress={handleFinish}
            />
            {/* Espaco para o banner de descanso nao cobrir o fim da lista. */}
            {rest && <View style={styles.restSpacer} />}
          </>
        )}
      </Screen>

      {rest && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.restWrapper} pointerEvents="box-none">
          <ThemedView type="accent" style={styles.restBanner}>
            <View style={styles.flex}>
              <ThemedText type="small" themeColor="accentText">
                Descanso · {rest.exerciseName}
              </ThemedText>
              <ThemedText style={styles.restClock} themeColor="accentText">
                {formatClock(restRemaining)}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => setRest(null)}
              hitSlop={8}
              style={[styles.skipButton, { borderColor: theme.accentText }]}>
              <ThemedText type="smallBold" themeColor="accentText">
                Pular
              </ThemedText>
            </Pressable>
          </ThemedView>
        </Animated.View>
      )}

      <RegisterWeightModal
        entry={weightEntry}
        isSubmitting={isWeightSubmitting}
        serverError={weightError}
        onClose={() => {
          setWeightEntry(null);
          setWeightError(null);
        }}
        onConfirm={handleConfirmWeight}
      />
    </>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.metric}>
      <ThemedText style={styles.metricValue} themeColor={accent ? 'accent' : 'text'}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.metricLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  loading: {
    marginTop: Spacing.five,
  },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricPressable: {
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  sets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  setChip: {
    minWidth: 48,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
  },
  restSpacer: {
    height: 110,
  },
  restWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.five,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  restBanner: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.large,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  restClock: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  skipButton: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  finished: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  finishedBadge: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishedCheck: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '800',
  },
  centerText: {
    textAlign: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
