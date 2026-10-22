import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from '@/types/workout';
import type { Exercise } from '@/types/exercise';

type AddExerciseModalProps = {
  exercise: Exercise | null;
  isSubmitting: boolean;
  serverError?: string | null;
  onClose: () => void;
  onConfirm: (input: { dayOfWeek: Weekday; sets: number; reps: number; weight: number | null; restSeconds: number | null }) => void;
};

export function AddExerciseModal({ exercise, isSubmitting, serverError, onClose, onConfirm }: AddExerciseModalProps) {
  const theme = useTheme();
  const [dayOfWeek, setDayOfWeek] = useState<Weekday>('MONDAY');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('12');
  const [weight, setWeight] = useState('');
  const [rest, setRest] = useState('60');
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const setsNumber = Number(sets);
    const repsNumber = Number(reps);
    const trimmedWeight = weight.trim().replace(',', '.');
    const weightNumber = trimmedWeight ? Number(trimmedWeight) : null;
    const restNumber = rest.trim() ? Number(rest.trim()) : null;

    if (!setsNumber || setsNumber < 1 || !repsNumber || repsNumber < 1) {
      setError('Informe séries e repetições válidas.');
      return;
    }

    if (weightNumber !== null && (Number.isNaN(weightNumber) || weightNumber < 0)) {
      setError('Informe um peso válido.');
      return;
    }

    if (restNumber !== null && (!Number.isInteger(restNumber) || restNumber < 0)) {
      setError('Informe o descanso em segundos (ex: 60).');
      return;
    }

    setError(null);
    onConfirm({ dayOfWeek, sets: setsNumber, reps: repsNumber, weight: weightNumber, restSeconds: restNumber });
  }

  return (
    <Modal visible={Boolean(exercise)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView type="card" style={[styles.sheet, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            {exercise?.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {exercise?.muscleGroup} · {exercise?.equipment}
          </ThemedText>

          <ThemedText type="smallBold" style={styles.label}>
            Dia da semana
          </ThemedText>
          <View style={styles.dayRow}>
            {WEEKDAYS.map((day) => {
              const isSelected = day === dayOfWeek;
              return (
                <Pressable
                  key={day}
                  onPress={() => setDayOfWeek(day)}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.inputBackground,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="small"
                    themeColor={isSelected ? 'accentText' : 'textSecondary'}
                    style={styles.dayPillLabel}>
                    {WEEKDAY_LABELS[day].slice(0, 3)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.numberRow}>
            <View style={styles.numberField}>
              <ThemedText type="smallBold" style={styles.label}>
                Séries
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
                ]}
                keyboardType="number-pad"
                value={sets}
                onChangeText={setSets}
              />
            </View>
            <View style={styles.numberField}>
              <ThemedText type="smallBold" style={styles.label}>
                Repetições
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
                ]}
                keyboardType="number-pad"
                value={reps}
                onChangeText={setReps}
              />
            </View>
            <View style={styles.numberField}>
              <ThemedText type="smallBold" style={styles.label}>
                Descanso (s)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
                ]}
                keyboardType="number-pad"
                value={rest}
                onChangeText={setRest}
              />
            </View>
          </View>

          <ThemedText type="smallBold" style={styles.label}>
            Peso (kg) — opcional
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
            ]}
            placeholder="Ex: 20"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />

          {(error || serverError) && (
            <ThemedText type="small" themeColor="danger">
              {error ?? serverError}
            </ThemedText>
          )}

          <PrimaryButton label="Adicionar ao treino" isLoading={isSubmitting} onPress={handleConfirm} />

          <Pressable onPress={onClose} hitSlop={8} style={styles.cancelButton}>
            <ThemedText type="small" themeColor="textSecondary">
              Cancelar
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  label: {
    marginTop: Spacing.two,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  dayPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  dayPillLabel: {
    textTransform: 'uppercase',
  },
  numberRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  numberField: {
    flex: 1,
  },
  input: {
    fontFamily: FontFamily.regular,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
