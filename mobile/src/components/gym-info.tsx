import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { InfoRow } from '@/components/info-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { GymSummary } from '@/types/user';
import { formatPhone } from '@/utils/contact';

function openInMaps(query: string) {
  // Link https: abre o app de mapas do celular (ou o navegador) no Android e no iOS.
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
}

// Nome, telefone e endereco da academia, com atalho para abrir no mapa.
export function GymInfo({ gym }: { gym: GymSummary }) {
  return (
    <>
      <InfoRow label="Academia" value={gym.name} />
      {gym.phone && <InfoRow label="Telefone" value={formatPhone(gym.phone)} />}
      <View style={styles.address}>
        <ThemedText type="small" themeColor="textSecondary">
          Endereço
        </ThemedText>
        <ThemedText type="small" themeColor={gym.address ? 'text' : 'textSecondary'}>
          {gym.address?.formatted ?? 'Não informado'}
        </ThemedText>
        {gym.address && (
          <Pressable
            hitSlop={8}
            accessibilityRole="link"
            onPress={() => openInMaps(`${gym.name}, ${gym.address!.formatted}`)}>
            <ThemedText type="link" themeColor="accent">
              Abrir no mapa
            </ThemedText>
          </Pressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  address: {
    gap: Spacing.one,
  },
});
