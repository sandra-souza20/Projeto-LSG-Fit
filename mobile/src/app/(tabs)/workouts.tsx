import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCatalogItem } from '@/components/workout/exercise-catalog-item';
import { ExerciseDetailsModal } from '@/components/workout/exercise-details-modal';
import { RegisterWeightModal } from '@/components/workout/register-weight-modal';
import { WorkoutDaySection } from '@/components/workout/workout-day-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutPlan } from '@/hooks/use-workout-plan';
import type { Exercise } from '@/types/exercise';
import type { WorkoutEntry } from '@/types/workout';

type Tab = 'plan' | 'catalog';

export default function WorkoutsScreen() {
  const theme = useTheme();
  const { plan, exercises, isLoading, error, registerWeight } = useWorkoutPlan();
  const [tab, setTab] = useState<Tab>('plan');
  const [search, setSearch] = useState('');
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [editingEntry, setEditingEntry] = useState<WorkoutEntry | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exercises;
    return exercises.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(query) || exercise.muscleGroup.toLowerCase().includes(query),
    );
  }, [exercises, search]);

  async function handleConfirmWeight(input: { weight: number | null }) {
    if (!editingEntry) return;

    setIsEditSubmitting(true);
    setEditFormError(null);
    try {
      await registerWeight(editingEntry.id, input.weight);
      setEditingEntry(null);
    } catch (err) {
      setEditFormError(err instanceof Error ? err.message : 'Não foi possível salvar a carga.');
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
            keyboardShouldPersistTaps="handled">
            {tab === 'plan' ? (
              plan.map((day) => (
                <WorkoutDaySection
                  key={day.dayOfWeek}
                  day={day}
                  editLabel="Carga"
                  onEditEntry={(entry) => {
                    setEditFormError(null);
                    setEditingEntry(entry);
                  }}
                />
              ))
            ) : (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Consulte os exercícios disponíveis. Quem monta sua ficha é o seu profissional.
                </ThemedText>
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
                    variant="view"
                    onPress={() => setPreviewExercise(exercise)}
                  />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <ExerciseDetailsModal exercise={previewExercise} onClose={() => setPreviewExercise(null)} />

      <RegisterWeightModal
        entry={editingEntry}
        isSubmitting={isEditSubmitting}
        serverError={editFormError}
        onClose={() => {
          setEditingEntry(null);
          setEditFormError(null);
        }}
        onConfirm={handleConfirmWeight}
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
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
});
