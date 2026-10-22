import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FrequencyCalendar } from '@/components/frequency-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StudentFrequencyModalProps = {
  student: { id: string; name: string } | null;
  onClose: () => void;
};

// Caso de uso "Verificar Frequencia": calendario do aluno na visao da academia.
export function StudentFrequencyModal({ student, onClose }: StudentFrequencyModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={student !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView type="card" style={[styles.sheet, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            {student?.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Dias em que o aluno finalizou um treino no app.
          </ThemedText>

          <ScrollView style={styles.scroll}>
            {student && <FrequencyCalendar sessionsPath={`/gyms/me/students/${student.id}/workout-sessions`} />}
          </ScrollView>

          <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
            <ThemedText type="small" themeColor="textSecondary">
              Fechar
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
    maxHeight: '90%',
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
  closeButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
});
