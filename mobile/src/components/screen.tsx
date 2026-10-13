import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = {
  title?: string;
  // Texto do link de voltar; quando ausente a tela nao mostra o link.
  backLabel?: string;
  // Telas dentro das abas precisam reservar espaco para a barra inferior.
  withTabBar?: boolean;
  scroll?: boolean;
  header?: ReactNode;
  children: ReactNode;
};

// Estrutura comum das telas internas: fundo do tema, largura maxima,
// margens e (opcionalmente) rolagem e link de voltar.
export function Screen({ title, backLabel, withTabBar, scroll = true, header, children }: ScreenProps) {
  const router = useRouter();
  const bottomInset = withTabBar ? BottomTabInset + Spacing.four : Spacing.four;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {backLabel && (
          <Pressable
            // Aberta direto por link (sem historico), a tela volta para o inicio.
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={8}
            style={styles.backButton}>
            <ThemedText type="link" themeColor="accent">
              ← {backLabel}
            </ThemedText>
          </Pressable>
        )}
        {header}
        {title && <ThemedText type="subtitle">{title}</ThemedText>}

        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content, { paddingBottom: bottomInset }]}>{children}</View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.three }),
    gap: Spacing.three,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
  },
});
