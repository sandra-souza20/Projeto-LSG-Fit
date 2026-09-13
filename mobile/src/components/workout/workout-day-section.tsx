import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ExerciseMedia } from '@/components/workout/exercise-media';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_LABELS, type WorkoutDay, type WorkoutEntry } from '@/types/workout';

type WorkoutDaySectionProps = {
  day: WorkoutDay;
  onEditEntry: (entry: WorkoutEntry) => void;
  onRemoveEntry?: (id: string) => void;
  editLabel?: string;
};

function formatWeight(weight: number) {
  return Number.isInteger(weight) ? String(weight) : String(weight).replace('.', ',');
}

export function WorkoutDaySection({ day, onEditEntry, onRemoveEntry, editLabel = 'Editar' }: WorkoutDaySectionProps) {
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ThemedView type="card" style={[styles.container, { borderColor: theme.border }]}>
      <ThemedText type="smallBold" style={styles.dayLabel}>
        {WEEKDAY_LABELS[day.dayOfWeek]}
      </ThemedText>

      {day.entries.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nenhum exercício adicionado ainda.
        </ThemedText>
      ) : (
        <View style={styles.entries}>
          {day.entries.map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <View key={entry.id} style={[styles.entryCard, { borderColor: theme.border }]}>
                <View style={styles.entryRow}>
                  <Pressable
                    style={styles.entryInfo}
                    onPress={() => setExpandedId(isExpanded ? null : entry.id)}>
                    <ThemedText type="small">{entry.exercise.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {entry.sets}x{entry.reps}
                      {entry.weight != null ? ` · ${formatWeight(entry.weight)}kg` : ''}
                    </ThemedText>
                    <ThemedText type="small" themeColor="accent">
                      {isExpanded ? '▴' : '▾'}
                    </ThemedText>
                  </Pressable>
                  <View style={styles.entryActions}>
                    <Pressable onPress={() => onEditEntry(entry)} hitSlop={8}>
                      <ThemedText type="small" themeColor="accent">
                        {editLabel}
                      </ThemedText>
                    </Pressable>
                    {onRemoveEntry && (
                      <Pressable onPress={() => onRemoveEntry(entry.id)} hitSlop={8}>
                        <ThemedText type="small" themeColor="danger">
                          Remover
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                </View>

                {isExpanded && (
                  <Animated.View entering={FadeIn.duration(150)} style={styles.entryExpanded}>
                    <ExerciseMedia exercise={entry.exercise} />
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dayLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entries: {
    gap: Spacing.two,
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.two,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryInfo: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'baseline',
  },
  entryActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  entryExpanded: {
    marginTop: Spacing.three,
  },
});
