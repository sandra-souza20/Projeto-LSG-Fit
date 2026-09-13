import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';

type LogoProps = {
  withTagline?: boolean;
};

export function Logo({ withTagline = true }: LogoProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Image
          source={require('@/assets/images/dumbbell-icon.png')}
          style={styles.icon}
          contentFit="contain"
        />
        <ThemedText style={styles.brandText}>
          LSG <ThemedText themeColor="accent" style={styles.brandText}>FIT</ThemedText>
        </ThemedText>
      </View>
      {withTagline && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
          UM NOVO ESTILO DE VIDA
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  icon: {
    width: 36,
    height: 46,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
