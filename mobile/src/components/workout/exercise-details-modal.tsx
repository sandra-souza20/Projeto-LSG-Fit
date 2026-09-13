import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ExerciseMedia } from '@/components/workout/exercise-media';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise } from '@/types/exercise';

type ExerciseDetailsModalProps = {
  exercise: Exercise | null;
  onClose: () => void;
};

// Usado no catalogo do aluno, que so pode consultar exercicios (ver
// instrucoes, video/gif) — quem monta a ficha e o profissional.
export function ExerciseDetailsModal({ exercise, onClose }: ExerciseDetailsModalProps) {
  const theme = useTheme();

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

          <ScrollView style={styles.scroll}>{exercise && <ExerciseMedia exercise={exercise} />}</ScrollView>

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
  scroll: {
    flexGrow: 0,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
