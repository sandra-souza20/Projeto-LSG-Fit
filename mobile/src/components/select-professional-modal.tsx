import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProfessionals, type ProfessionalSummary } from '@/hooks/use-professionals';

type SelectProfessionalModalProps = {
  visible: boolean;
  isSubmitting: boolean;
  serverError?: string | null;
  onClose: () => void;
  onSelect: (professional: ProfessionalSummary) => void;
};

export function SelectProfessionalModal({
  visible,
  isSubmitting,
  serverError,
  onClose,
  onSelect,
}: SelectProfessionalModalProps) {
  const theme = useTheme();
  const { professionals, isLoading, error } = useProfessionals();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView type="card" style={[styles.sheet, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            Escolher profissional
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Selecione o profissional que vai montar o seu treino
          </ThemedText>

          {isLoading ? (
            <ActivityIndicator color={theme.accent} style={styles.loading} />
          ) : error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : professionals.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nenhum profissional cadastrado ainda.
            </ThemedText>
          ) : (
            <FlatList
              data={professionals}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [
                    styles.professionalRow,
                    { borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.email}
                  </ThemedText>
                </Pressable>
              )}
            />
          )}

          {serverError && (
            <ThemedText type="small" themeColor="danger">
              {serverError}
            </ThemedText>
          )}

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
    maxHeight: '80%',
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  loading: {
    marginVertical: Spacing.four,
  },
  list: {
    flexGrow: 0,
  },
  professionalRow: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
