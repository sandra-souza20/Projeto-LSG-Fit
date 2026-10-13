import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useGyms } from '@/hooks/use-gyms';
import { useTheme } from '@/hooks/use-theme';

type GymPickerProps = {
  value: string | null;
  onChange: (gymId: string | null) => void;
};

// Vinculo opcional do profissional com uma academia (relacao "Contrata" do DER).
export function GymPicker({ value, onChange }: GymPickerProps) {
  const theme = useTheme();
  const { gyms, isLoading, error } = useGyms();

  const options = [{ id: null, name: 'Autônomo' }, ...gyms];

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Academia</ThemedText>
      {isLoading ? (
        <ActivityIndicator color={theme.accent} />
      ) : error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : (
        <View style={styles.row}>
          {options.map((gym) => {
            const isSelected = gym.id === value;
            return (
              <Pressable
                key={gym.id ?? 'none'}
                onPress={() => onChange(gym.id)}
                style={[
                  styles.pill,
                  { backgroundColor: isSelected ? theme.accent : theme.inputBackground, borderColor: theme.border },
                ]}>
                <ThemedText type="small" themeColor={isSelected ? 'accentText' : 'textSecondary'}>
                  {gym.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
