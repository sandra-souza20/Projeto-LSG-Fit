import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PhysicalAssessmentInput } from '@/types/physical-assessment';

type AddAssessmentModalProps = {
  visible: boolean;
  isSubmitting: boolean;
  serverError?: string | null;
  onClose: () => void;
  onConfirm: (input: PhysicalAssessmentInput) => void;
};

type FieldKey = 'weight' | 'height' | 'chest' | 'waist' | 'hip' | 'arm' | 'thigh';

const OPTIONAL_FIELDS: { key: Exclude<FieldKey, 'weight'>; label: string }[] = [
  { key: 'height', label: 'Altura (cm)' },
  { key: 'chest', label: 'Peito (cm)' },
  { key: 'waist', label: 'Cintura (cm)' },
  { key: 'hip', label: 'Quadril (cm)' },
  { key: 'arm', label: 'Braço (cm)' },
  { key: 'thigh', label: 'Coxa (cm)' },
];

function parseNumber(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  return trimmed ? Number(trimmed) : null;
}

export function AddAssessmentModal({
  visible,
  isSubmitting,
  serverError,
  onClose,
  onConfirm,
}: AddAssessmentModalProps) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    weight: '',
    height: '',
    chest: '',
    waist: '',
    hip: '',
    arm: '',
    thigh: '',
  });
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function setField(key: FieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleClose() {
    setValues({ weight: '', height: '', chest: '', waist: '', hip: '', arm: '', thigh: '' });
    setNotes('');
    setError(null);
    onClose();
  }

  function handleConfirm() {
    const weight = parseNumber(values.weight);

    if (!weight || weight <= 0) {
      setError('Informe um peso válido.');
      return;
    }

    const optionalValues: Record<string, number | null> = {};
    for (const { key } of OPTIONAL_FIELDS) {
      const parsed = parseNumber(values[key]);
      if (parsed !== null && parsed <= 0) {
        setError('As medidas informadas devem ser maiores que zero.');
        return;
      }
      optionalValues[key] = parsed;
    }

    setError(null);
    onConfirm({
      weight,
      height: optionalValues.height ?? null,
      chest: optionalValues.chest ?? null,
      waist: optionalValues.waist ?? null,
      hip: optionalValues.hip ?? null,
      arm: optionalValues.arm ?? null,
      thigh: optionalValues.thigh ?? null,
      notes: notes.trim() || null,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <ThemedView type="card" style={[styles.sheet, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            Nova avaliação física
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Só o peso é obrigatório — preencha as medidas que fizer sentido
          </ThemedText>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <ThemedText type="smallBold" style={styles.label}>
              Peso (kg)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Ex: 70"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={values.weight}
              onChangeText={(value) => setField('weight', value)}
            />

            <View style={styles.grid}>
              {OPTIONAL_FIELDS.map(({ key, label }) => (
                <View key={key} style={styles.gridField}>
                  <ThemedText type="smallBold" style={styles.label}>
                    {label}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
                    ]}
                    placeholder="Opcional"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    value={values[key]}
                    onChangeText={(value) => setField(key, value)}
                  />
                </View>
              ))}
            </View>

            <ThemedText type="smallBold" style={styles.label}>
              Observações
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Opcional"
              placeholderTextColor={theme.textSecondary}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {(error || serverError) && (
            <ThemedText type="small" themeColor="danger">
              {error ?? serverError}
            </ThemedText>
          )}

          <PrimaryButton label="Salvar avaliação" isLoading={isSubmitting} onPress={handleConfirm} />

          <Pressable onPress={handleClose} hitSlop={8} style={styles.cancelButton}>
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
    maxHeight: '85%',
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  scroll: {
    flexGrow: 0,
  },
  label: {
    marginTop: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  gridField: {
    width: '47%',
  },
  input: {
    fontFamily: FontFamily.regular,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
