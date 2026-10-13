import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { CreateExerciseModal, type CreateExerciseInput } from '@/components/workout/create-exercise-modal';
import { ExerciseCatalogItem } from '@/components/workout/exercise-catalog-item';
import { ExerciseDetailsModal } from '@/components/workout/exercise-details-modal';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { apiRequest } from '@/services/api';
import type { Exercise } from '@/types/exercise';

// RF08: biblioteca de exercicios. O profissional consulta o catalogo e
// cadastra novos exercicios com descricao e video demonstrativo.
export default function ExerciseLibraryScreen() {
  const theme = useTheme();
  const { token, professional } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      setExercises(await apiRequest<Exercise[]>('/exercises', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a biblioteca.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const muscleGroups = useMemo(
    () => [...new Set(exercises.map((exercise) => exercise.muscleGroup))].sort((a, b) => a.localeCompare(b)),
    [exercises],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exercises.filter(
      (exercise) =>
        (!groupFilter || exercise.muscleGroup === groupFilter) &&
        (!onlyMine || exercise.createdByProfessionalId === professional?.id) &&
        (!query || exercise.name.toLowerCase().includes(query)),
    );
  }, [exercises, search, groupFilter, onlyMine, professional?.id]);

  async function handleCreate(input: CreateExerciseInput) {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const created = await apiRequest<Exercise>('/exercises', { method: 'POST', body: input, token });
      setExercises((current) =>
        [...current, created].sort(
          (a, b) => a.muscleGroup.localeCompare(b.muscleGroup) || a.name.localeCompare(b.name),
        ),
      );
      setIsCreateVisible(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível cadastrar o exercício.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(exercise: Exercise) {
    setRemoveError(null);
    try {
      await apiRequest<void>(`/exercises/${exercise.id}`, { method: 'DELETE', token });
      setExercises((current) => current.filter((item) => item.id !== exercise.id));
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Não foi possível remover o exercício.');
    }
  }

  function renderFilter(label: string, isSelected: boolean, onPress: () => void) {
    return (
      <Pressable
        key={label}
        onPress={onPress}
        style={[
          styles.filterChip,
          { backgroundColor: isSelected ? theme.accent : theme.inputBackground, borderColor: theme.border },
        ]}>
        <ThemedText type="small" themeColor={isSelected ? 'accentText' : 'textSecondary'}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <>
      <Screen title="Biblioteca" backLabel="Meus alunos">
        <ThemedText type="small" themeColor="textSecondary">
          {exercises.length} exercícios com instruções de execução. Cadastre novos para usar nas fichas dos
          seus alunos.
        </ThemedText>

        <PrimaryButton
          label="Cadastrar exercício"
          onPress={() => {
            setFormError(null);
            setIsCreateVisible(true);
          }}
        />

        <TextInput
          placeholder="Buscar exercício"
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
          style={[
            styles.searchInput,
            { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
          ]}
        />

        <View style={styles.filters}>
          {renderFilter('Todos', !groupFilter && !onlyMine, () => {
            setGroupFilter(null);
            setOnlyMine(false);
          })}
          {renderFilter('Meus', onlyMine, () => setOnlyMine((current) => !current))}
          {muscleGroups.map((group) =>
            renderFilter(group, groupFilter === group, () => setGroupFilter(groupFilter === group ? null : group)),
          )}
        </View>

        {removeError && (
          <ThemedText type="small" themeColor="danger">
            {removeError}
          </ThemedText>
        )}

        {isLoading ? (
          <ActivityIndicator color={theme.accent} style={styles.loading} />
        ) : error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : filtered.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nenhum exercício encontrado.
          </ThemedText>
        ) : (
          filtered.map((exercise) => (
            <View key={exercise.id} style={styles.item}>
              <ExerciseCatalogItem exercise={exercise} variant="view" onPress={() => setPreviewExercise(exercise)} />
              {exercise.createdByProfessionalId === professional?.id && (
                <Pressable hitSlop={8} onPress={() => handleRemove(exercise)} style={styles.removeButton}>
                  <ThemedText type="small" themeColor="danger">
                    Remover exercício cadastrado por você
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ))
        )}
      </Screen>

      <ExerciseDetailsModal exercise={previewExercise} onClose={() => setPreviewExercise(null)} />

      <CreateExerciseModal
        visible={isCreateVisible}
        muscleGroups={muscleGroups}
        isSubmitting={isSubmitting}
        serverError={formError}
        onClose={() => setIsCreateVisible(false)}
        onConfirm={handleCreate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  loading: {
    marginTop: Spacing.five,
  },
  item: {
    gap: Spacing.one,
  },
  removeButton: {
    alignSelf: 'flex-end',
  },
});
