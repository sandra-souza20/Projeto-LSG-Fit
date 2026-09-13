import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise } from '@/types/exercise';

type ExerciseCatalogItemProps = {
  exercise: Exercise;
  onPress: () => void;
  // 'add' (padrao, usado pelo profissional montando a ficha) mostra um "+" em
  // destaque; 'view' (usado pelo aluno, que so pode consultar o catalogo) mostra
  // um indicador neutro de "ver detalhes".
  variant?: 'add' | 'view';
};

export function ExerciseCatalogItem({ exercise, onPress, variant = 'add' }: ExerciseCatalogItemProps) {
  const theme = useTheme();
  const isView = variant === 'view';

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.info}>
        <ThemedText type="smallBold">{exercise.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {exercise.muscleGroup} · {exercise.equipment}
        </ThemedText>
      </View>

      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: isView ? theme.inputBackground : theme.accent },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" themeColor={isView ? 'text' : 'accentText'}>
          {isView ? '›' : '+'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
    paddingRight: Spacing.two,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
