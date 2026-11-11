import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ExerciseCatalogItem } from '@/components/workout/exercise-catalog-item';
import { ExerciseDetailsModal } from '@/components/workout/exercise-details-modal';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { apiRequest } from '@/services/api';
import type { Exercise } from '@/types/exercise';

// RF08: biblioteca de exercicios, so para consulta. Os exercicios sao
// cadastrados pela LSG FIT, com GIF e instrucoes no mesmo padrao para todas
// as academias.
export default function ExerciseLibraryScreen() {
  const theme = useTheme();
  const { token } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);

  // Depois da primeira carga, recargas (puxar para atualizar) mantem a lista na tela.
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    if (!hasLoaded.current) setIsLoading(true);
    setError(null);
    try {
      setExercises(await apiRequest<Exercise[]>('/exercises', { token }));
      hasLoaded.current = true;
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
        (!query || exercise.name.toLowerCase().includes(query)),
    );
  }, [exercises, search, groupFilter]);

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
      <Screen title="Biblioteca" withTabBar onRefresh={load}>
        <ThemedText type="small" themeColor="textSecondary">
          {exercises.length} exercícios com GIF e instruções de execução, no mesmo padrão para todas as academias.
        </ThemedText>

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
          {renderFilter('Todos', !groupFilter, () => setGroupFilter(null))}
          {muscleGroups.map((group) =>
            renderFilter(group, groupFilter === group, () => setGroupFilter(groupFilter === group ? null : group)),
          )}
        </View>

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
            <ExerciseCatalogItem
              key={exercise.id}
              exercise={exercise}
              variant="view"
              onPress={() => setPreviewExercise(exercise)}
            />
          ))
        )}
      </Screen>

      <ExerciseDetailsModal exercise={previewExercise} onClose={() => setPreviewExercise(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    fontFamily: FontFamily.regular,
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
});
