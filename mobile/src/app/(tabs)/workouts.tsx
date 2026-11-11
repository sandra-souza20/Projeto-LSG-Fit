import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddExerciseModal } from '@/components/workout/add-exercise-modal';
import { EditEntryModal } from '@/components/workout/edit-entry-modal';
import { ExerciseCatalogItem } from '@/components/workout/exercise-catalog-item';
import { GymFilterToggle } from '@/components/workout/gym-filter-toggle';
import { WorkoutDaySection } from '@/components/workout/workout-day-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useCheckIn } from '@/hooks/use-check-in';
import { useTodayWorkout } from '@/hooks/use-today-workout';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutPlan } from '@/hooks/use-workout-plan';
import type { Exercise } from '@/types/exercise';
import { WEEKDAY_LABELS, WORKOUT_LETTERS, type Weekday, type WorkoutEntry } from '@/types/workout';

type Tab = 'plan' | 'catalog';

export default function WorkoutsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { plan, exercises, isLoading, error, reload, addEntry, updateEntry, removeEntry } = useWorkoutPlan();
  const { next, availability, reload: reloadToday } = useTodayWorkout(plan);
  const checkIn = useCheckIn();
  const { reload: reloadCheckIn } = checkIn;
  const refreshControl = usePullToRefresh(useCallback(() => Promise.all([reload(), reloadToday()]), [reload, reloadToday]));
  const [tab, setTab] = useState<Tab>('plan');
  const [search, setSearch] = useState('');
  // Com academia, o catalogo comeca mostrando so o que existe nela.
  const [onlyAtGym, setOnlyAtGym] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<WorkoutEntry | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      reload();
      reloadToday();
      reloadCheckIn();
    }, [reload, reloadToday, reloadCheckIn]),
  );

  const activeDays = useMemo(() => plan.filter((day) => day.entries.length > 0), [plan]);

  // availableAtGym vem null quando o aluno nao tem academia: sem filtro.
  const hasGym = exercises.some((exercise) => exercise.availableAtGym !== null);
  const availableCount = exercises.filter((exercise) => exercise.availableAtGym).length;

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exercises.filter(
      (exercise) =>
        (!hasGym || !onlyAtGym || exercise.availableAtGym) &&
        (!query ||
          exercise.name.toLowerCase().includes(query) ||
          exercise.muscleGroup.toLowerCase().includes(query)),
    );
  }, [exercises, search, hasGym, onlyAtGym]);

  async function handleConfirmAdd(input: {
    dayOfWeek: Weekday;
    sets: number;
    reps: number;
    weight: number | null;
    restSeconds: number | null;
  }) {
    if (!selectedExercise) return;

    setIsAddSubmitting(true);
    setAddFormError(null);
    try {
      await addEntry({ exerciseId: selectedExercise.id, ...input });
      setSelectedExercise(null);
    } catch (err) {
      setAddFormError(err instanceof Error ? err.message : 'Não foi possível adicionar o exercício.');
    } finally {
      setIsAddSubmitting(false);
    }
  }

  async function handleConfirmEdit(input: {
    sets: number;
    reps: number;
    weight: number | null;
    restSeconds: number | null;
  }) {
    if (!editingEntry) return;

    setIsEditSubmitting(true);
    setEditFormError(null);
    try {
      await updateEntry(editingEntry.id, input);
      setEditingEntry(null);
    } catch (err) {
      setEditFormError(err instanceof Error ? err.message : 'Não foi possível salvar as alterações.');
    } finally {
      setIsEditSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Treinos</ThemedText>

        <View style={[styles.tabSwitch, { borderColor: theme.border }]}>
          <Pressable style={styles.tabButtonTouchable} onPress={() => setTab('plan')}>
            <ThemedView type={tab === 'plan' ? 'accent' : 'background'} style={styles.tabButtonInner}>
              <ThemedText type="smallBold" themeColor={tab === 'plan' ? 'accentText' : 'textSecondary'}>
                Meu treino
              </ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable style={styles.tabButtonTouchable} onPress={() => setTab('catalog')}>
            <ThemedView type={tab === 'catalog' ? 'accent' : 'background'} style={styles.tabButtonInner}>
              <ThemedText type="smallBold" themeColor={tab === 'catalog' ? 'accentText' : 'textSecondary'}>
                Catálogo
              </ThemedText>
            </ThemedView>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={theme.accent} style={styles.loading} />
        ) : error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}>
            {tab === 'plan' ? (
              activeDays.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Sua ficha ainda está vazia. Monte seu treino pelo Catálogo
                  {user?.professionalId ? ' ou peça ao seu profissional.' : '.'}
                </ThemedText>
              ) : (
                activeDays.map((day, index) => (
                  <WorkoutDaySection
                    key={day.dayOfWeek}
                    day={day}
                    label={`Treino de ${WEEKDAY_LABELS[day.dayOfWeek].toLowerCase()}`}
                    collapsible
                    numbered
                    viewerId={user?.id}
                    onEditEntry={(entry) => {
                      setEditFormError(null);
                      setEditingEntry(entry);
                    }}
                    onRemoveEntry={removeEntry}
                    // So o treino do dia pode ser iniciado, e so se ainda nao treinou hoje.
                    onStart={
                      next?.isToday && next.day.dayOfWeek === day.dayOfWeek && checkIn.canTrain
                        ? () =>
                            router.push({
                              pathname: '/workout-session',
                              params: { day: day.dayOfWeek, letter: WORKOUT_LETTERS[index] },
                            })
                        : undefined
                    }
                    startHint={
                      next?.isToday && next.day.dayOfWeek === day.dayOfWeek
                        ? 'Faça o check-in na tela inicial para iniciar'
                        : availability(day.dayOfWeek) === 'concluído hoje'
                          ? 'Treino de hoje concluído'
                          : `Disponível ${availability(day.dayOfWeek)}`
                    }
                  />
                ))
              )
            ) : (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Toque em + para colocar um exercício na sua ficha e escolher o dia.
                </ThemedText>
                {hasGym && (
                  <GymFilterToggle
                    value={onlyAtGym}
                    onChange={setOnlyAtGym}
                    availableCount={availableCount}
                    totalCount={exercises.length}
                  />
                )}
                <TextInput
                  placeholder="Buscar exercício ou grupo muscular"
                  placeholderTextColor={theme.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                  style={[
                    styles.searchInput,
                    { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
                  ]}
                />
                {filteredExercises.map((exercise) => (
                  <ExerciseCatalogItem
                    key={exercise.id}
                    exercise={exercise}
                    onPress={() => {
                      setAddFormError(null);
                      setSelectedExercise(exercise);
                    }}
                  />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <AddExerciseModal
        exercise={selectedExercise}
        isSubmitting={isAddSubmitting}
        serverError={addFormError}
        onClose={() => {
          setSelectedExercise(null);
          setAddFormError(null);
        }}
        onConfirm={handleConfirmAdd}
      />

      <EditEntryModal
        entry={editingEntry}
        isSubmitting={isEditSubmitting}
        serverError={editFormError}
        onClose={() => {
          setEditingEntry(null);
          setEditFormError(null);
        }}
        onConfirm={handleConfirmEdit}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.three }),
    gap: Spacing.three,
  },
  tabSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.pill,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tabButtonTouchable: {
    flex: 1,
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  loading: {
    marginTop: Spacing.five,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  searchInput: {
    fontFamily: FontFamily.regular,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
});
