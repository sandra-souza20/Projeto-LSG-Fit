import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutEntry } from '@/types/workout';

type RegisterWeightModalProps = {
  entry: WorkoutEntry | null;
  isSubmitting: boolean;
  serverError?: string | null;
  onClose: () => void;
  onConfirm: (input: { weight: number | null }) => void;
};

// Series e repeticoes sao definidas pelo profissional; aqui o aluno so
// registra a carga que usou (RF "Registrar Carga").
export function RegisterWeightModal({ entry, isSubmitting, serverError, onClose, onConfirm }: RegisterWeightModalProps) {
  const theme = useTheme();
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setWeight(entry.weight != null ? String(entry.weight).replace('.', ',') : '');
      setError(null);
    }
  }, [entry]);

  function handleConfirm() {
    const trimmedWeight = weight.trim().replace(',', '.');
    const weightNumber = trimmedWeight ? Number(trimmedWeight) : null;

    if (weightNumber !== null && (Number.isNaN(weightNumber) || weightNumber < 0)) {
      setError('Informe um peso válido.');
      return;
    }

    setError(null);
    onConfirm({ weight: weightNumber });
  }

  return (
    <Modal visible={Boolean(entry)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView type="card" style={[styles.sheet, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            {entry?.exercise.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {entry?.sets}x{entry?.reps} · definido pelo seu profissional
          </ThemedText>

          <ThemedText type="smallBold" style={styles.label}>
            Peso utilizado (kg)
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

          <PrimaryButton label="Salvar carga" isLoading={isSubmitting} onPress={handleConfirm} />

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
  input: {
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
