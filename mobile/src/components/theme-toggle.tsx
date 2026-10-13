import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemePreference } from '@/contexts/theme-context';
import { useTheme } from '@/hooks/use-theme';

// Linha com interruptor, usada nas telas de perfil.
export function ThemeToggleRow() {
  const theme = useTheme();
  const { colorScheme, setColorScheme } = useThemePreference();

  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText type="smallBold">Tema escuro</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Preto e verde neon. Desative para usar o tema claro.
        </ThemedText>
      </View>
      <Switch
        value={colorScheme === 'dark'}
        onValueChange={(isDark) => setColorScheme(isDark ? 'dark' : 'light')}
        trackColor={{ false: theme.backgroundSelected, true: theme.accent }}
        thumbColor={colorScheme === 'dark' ? theme.accentText : '#FFFFFF'}
      />
    </View>
  );
}

// Botao compacto para as telas de login/cadastro (RF01).
export function ThemeToggleButton() {
  const theme = useTheme();
  const { colorScheme, toggleColorScheme } = useThemePreference();

  return (
    <Pressable
      onPress={toggleColorScheme}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={colorScheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
      style={({ pressed }) => [styles.button, { borderColor: theme.border }, pressed && styles.pressed]}>
      <ThemedText type="small" themeColor="textSecondary">
        {colorScheme === 'dark' ? '☀ Tema claro' : '☾ Tema escuro'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
