import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ConfirmLogoutModal } from '@/components/confirm-logout-modal';
import { SelectProfessionalModal } from '@/components/select-professional-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProfessionals, type ProfessionalSummary } from '@/hooks/use-professionals';

export default function HomeScreen() {
  const { user, signOut, linkProfessional } = useAuth();
  const { professionals } = useProfessionals();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isSelectModalVisible, setIsSelectModalVisible] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const currentProfessional = useMemo(
    () => professionals.find((professional) => professional.id === user?.professionalId) ?? null,
    [professionals, user?.professionalId],
  );

  async function handleSelectProfessional(professional: ProfessionalSummary) {
    setIsLinking(true);
    setLinkError(null);
    try {
      await linkProfessional(professional.id);
      setIsSelectModalVisible(false);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Não foi possível vincular o profissional.');
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader name={user?.name ?? ''} onLogout={() => setIsLogoutModalVisible(true)} />

        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <ThemedText type="subtitle">Pronto para treinar?</ThemedText>
          <ThemedText themeColor="textSecondary">
            Acompanhe seus treinos e evolua a cada dia com a LSG FIT.
          </ThemedText>
        </ThemedView>

        <ThemedView type="card" style={styles.professionalCard}>
          <ThemedText type="smallBold">Seu profissional</ThemedText>
          {currentProfessional ? (
            <>
              <ThemedText>{currentProfessional.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {currentProfessional.email}
              </ThemedText>
              <Pressable hitSlop={8} onPress={() => setIsSelectModalVisible(true)}>
                <ThemedText type="link" themeColor="accent">
                  Trocar profissional
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Você ainda não tem um profissional vinculado. Escolha um para que ele possa montar o seu
                treino.
              </ThemedText>
              <Pressable hitSlop={8} onPress={() => setIsSelectModalVisible(true)}>
                <ThemedText type="link" themeColor="accent">
                  Escolher profissional
                </ThemedText>
              </Pressable>
            </>
          )}
        </ThemedView>
      </SafeAreaView>

      <ConfirmLogoutModal
        visible={isLogoutModalVisible}
        onCancel={() => setIsLogoutModalVisible(false)}
        onConfirm={() => {
          setIsLogoutModalVisible(false);
          signOut();
        }}
      />

      <SelectProfessionalModal
        visible={isSelectModalVisible}
        isSubmitting={isLinking}
        serverError={linkError}
        onClose={() => {
          setIsSelectModalVisible(false);
          setLinkError(null);
        }}
        onSelect={handleSelectProfessional}
      />
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
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.four,
  },
  heroCard: {
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  professionalCard: {
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
