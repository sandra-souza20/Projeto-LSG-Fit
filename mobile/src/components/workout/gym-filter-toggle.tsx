import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type GymFilterToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  availableCount: number;
  totalCount: number;
};

// "Só da academia": mostra apenas os exercicios que existem na academia do
// aluno. Desligado, mostra todos (os outros com aviso).
export function GymFilterToggle({ value, onChange, availableCount, totalCount }: GymFilterToggleProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.row}>
      <View style={[styles.box, { borderColor: theme.border, backgroundColor: value ? theme.accent : 'transparent' }]}>
        {value && (
          <ThemedText type="smallBold" themeColor="accentText">
            ✓
          </ThemedText>
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        Só os disponíveis na academia ({availableCount} de {totalCount})
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  box: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
});
