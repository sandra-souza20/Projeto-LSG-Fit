import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from './themed-text';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label: string;
  isPassword?: boolean;
  error?: string;
};

export function TextField({ label, isPassword, error, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [isSecure, setIsSecure] = useState(Boolean(isPassword));

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
            isPassword && styles.inputWithToggle,
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          {...rest}
        />
        {isPassword && (
          <Pressable
            style={styles.toggleButton}
            hitSlop={8}
            onPress={() => setIsSecure((current) => !current)}>
            <ThemedText type="small" themeColor="accent">
              {isSecure ? 'Mostrar' : 'Ocultar'}
            </ThemedText>
          </Pressable>
        )}
      </View>
      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  label: {
    marginBottom: Spacing.half,
  },
  inputRow: {
    justifyContent: 'center',
  },
  input: {
    fontFamily: FontFamily.regular,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  inputWithToggle: {
    paddingRight: 76,
  },
  toggleButton: {
    position: 'absolute',
    right: Spacing.three,
  },
});
