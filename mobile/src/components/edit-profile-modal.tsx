import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ProfileField = {
  key: string;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  required?: boolean;
};

type EditProfileModalProps = {
  visible: boolean;
  title: string;
  fields: ProfileField[];
  initialValues: Record<string, string>;
  onClose: () => void;
  // Recebe os valores ja aparados; deve lancar erro para mostrar no modal.
  onSave: (values: Record<string, string>) => Promise<void>;
};

// Formulario generico de edicao de dados (aluno, profissional e academia).
export function EditProfileModal({ visible, title, fields, initialValues, onClose, onSave }: EditProfileModalProps) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setValues(initialValues);
      setError(null);
    }
    // initialValues e recriado a cada render da tela; so reinicia ao abrir.
  }, [visible]);

  async function handleSave() {
    const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    const missing = fields.find((field) => field.required && !trimmed[field.key]);
    if (missing) {
      setError(`Preencha o campo "${missing.label}".`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView type="card" style={[styles.sheet, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {fields.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                keyboardType={field.keyboardType ?? 'default'}
                autoCapitalize={field.keyboardType ? 'none' : 'sentences'}
                multiline={field.multiline}
                style={field.multiline && styles.multiline}
                value={values[field.key] ?? ''}
                onChangeText={(text) => setValues((current) => ({ ...current, [field.key]: text }))}
              />
            ))}
          </ScrollView>

          {error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}

          <PrimaryButton label="Salvar" isLoading={isSubmitting} onPress={handleSave} />

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
  form: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
