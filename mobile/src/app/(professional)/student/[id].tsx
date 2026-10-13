import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FrequencyCalendar } from '@/components/frequency-calendar';
import { AddAssessmentModal } from '@/components/physical-assessment/add-assessment-modal';
import { AssessmentHistoryList } from '@/components/physical-assessment/assessment-history-list';
import { PrimaryButton } from '@/components/primary-button';
import { AddExerciseModal } from '@/components/workout/add-exercise-modal';
import { EditEntryModal } from '@/components/workout/edit-entry-modal';
import { ExerciseCatalogItem } from '@/components/workout/exercise-catalog-item';
import { WorkoutDaySection } from '@/components/workout/workout-day-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useStudentPhysicalAssessments } from '@/hooks/use-student-physical-assessments';
import { useStudentWorkoutPlan } from '@/hooks/use-student-workout-plan';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise } from '@/types/exercise';
import type { PhysicalAssessmentInput } from '@/types/physical-assessment';
import type { Weekday, WorkoutEntry } from '@/types/workout';

type Tab = 'plan' | 'catalog' | 'assessments';

export default function StudentWorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { plan, exercises, isLoading, error, addEntry, removeEntry, updateEntry } = useStudentWorkoutPlan(id);
  const {
    assessments,
    isLoading: isLoadingAssessments,
    error: assessmentsError,
    addAssessment,
  } = useStudentPhysicalAssessments(id);
  const [tab, setTab] = useState<Tab>('plan');
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<WorkoutEntry | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isAssessmentModalVisible, setIsAssessmentModalVisible] = useState(false);
  const [isAssessmentSubmitting, setIsAssessmentSubmitting] = useState(false);
  const [assessmentFormError, setAssessmentFormError] = useState<string | null>(null);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exercises;
    return exercises.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(query) || exercise.muscleGroup.toLowerCase().includes(query),
    );
  }, [exercises, search]);

  async function handleConfirmAdd(input: {
    dayOfWeek: Weekday;
    sets: number;
    reps: number;
    weight: number | null;
    restSeconds: number | null;
  }) {
    if (!selectedExercise) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await addEntry({ exerciseId: selectedExercise.id, ...input });
      setSelectedExercise(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível adicionar o exercício.');
    } finally {
      setIsSubmitting(false);
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

  async function handleConfirmAssessment(input: PhysicalAssessmentInput) {
    setIsAssessmentSubmitting(true);
    setAssessmentFormError(null);
    try {
      await addAssessment(input);
      setIsAssessmentModalVisible(false);
    } catch (err) {
      setAssessmentFormError(err instanceof Error ? err.message : 'Não foi possível salvar a avaliação.');
    } finally {
      setIsAssessmentSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <ThemedText type="link" themeColor="accent">
            ← Meus alunos
          </ThemedText>
        </Pressable>

        <ThemedText type="subtitle">{name ?? 'Treino do aluno'}</ThemedText>

        <View style={[styles.tabSwitch, { borderColor: theme.border }]}>
          <Pressable style={styles.tabButtonTouchable} onPress={() => setTab('plan')}>
            <ThemedView type={tab === 'plan' ? 'accent' : 'background'} style={styles.tabButtonInner}>
              <ThemedText type="smallBold" themeColor={tab === 'plan' ? 'accentText' : 'textSecondary'}>
                Ficha de treino
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
          <Pressable style={styles.tabButtonTouchable} onPress={() => setTab('assessments')}>
            <ThemedView type={tab === 'assessments' ? 'accent' : 'background'} style={styles.tabButtonInner}>
              <ThemedText type="smallBold" themeColor={tab === 'assessments' ? 'accentText' : 'textSecondary'}>
                Evolução
              </ThemedText>
            </ThemedView>
          </Pressable>
        </View>

        {tab === 'assessments' ? (
          isLoadingAssessments ? (
            <ActivityIndicator color={theme.accent} style={styles.loading} />
          ) : assessmentsError ? (
            <ThemedText type="small" themeColor="danger">
              {assessmentsError}
            </ThemedText>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              <ThemedText type="smallBold">Frequência</ThemedText>
              <FrequencyCalendar studentId={id} />
              <ThemedText type="smallBold">Avaliações físicas</ThemedText>
              <PrimaryButton label="Registrar avaliação" onPress={() => setIsAssessmentModalVisible(true)} />
              <AssessmentHistoryList assessments={assessments} />
            </ScrollView>
          )
        ) : isLoading ? (
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
                  onEditEntry={(entry) => {
                    setEditFormError(null);
                    setEditingEntry(entry);
                  }}
                  onRemoveEntry={removeEntry}
                />
              ))
            ) : (
              <>
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
                      setFormError(null);
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
        isSubmitting={isSubmitting}
        serverError={formError}
        onClose={() => {
          setSelectedExercise(null);
          setFormError(null);
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

      <AddAssessmentModal
        visible={isAssessmentModalVisible}
        isSubmitting={isAssessmentSubmitting}
        serverError={assessmentFormError}
        onClose={() => {
          setIsAssessmentModalVisible(false);
          setAssessmentFormError(null);
        }}
        onConfirm={handleConfirmAssessment}
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
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  backButton: {
    alignSelf: 'flex-start',
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
