import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

// Confirmacao dentro do app (evita os alertas do navegador, que travam a versao web).
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  isSubmitting = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <ThemedView type="card" style={[styles.sheet, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {message}
          </ThemedText>
          {error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.button,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Cancelar</ThemedText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                { backgroundColor: theme.danger },
                pressed && styles.pressed,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText type="smallBold" style={styles.confirmLabel}>
                  {confirmLabel}
                </ThemedText>
              )}
            </Pressable>
          </View>
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    borderWidth: 0,
  },
  confirmLabel: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
});
