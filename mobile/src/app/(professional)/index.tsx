import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ConfirmLogoutModal } from '@/components/confirm-logout-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProfessionalStudents } from '@/hooks/use-professional-students';
import { useTheme } from '@/hooks/use-theme';

export default function ProfessionalStudentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { professional, signOut } = useAuth();
  const { students, isLoading, error } = useProfessionalStudents();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader name={professional?.name ?? ''} onLogout={() => setIsLogoutModalVisible(true)} />

        <ThemedText type="subtitle">Meus alunos</ThemedText>

        {isLoading ? (
          <ActivityIndicator color={theme.accent} style={styles.loading} />
        ) : error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : students.length === 0 ? (
          <ThemedView type="card" style={[styles.emptyCard, { borderColor: theme.border }]}>
            <ThemedText themeColor="textSecondary">
              Nenhum aluno vinculado a você ainda. Peça para o aluno te selecionar como profissional no
              aplicativo dele.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/student/[id]', params: { id: item.id, name: item.name } })
                }>
                <ThemedView type="card" style={[styles.studentCard, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.email}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>

      <ConfirmLogoutModal
        visible={isLogoutModalVisible}
        onCancel={() => setIsLogoutModalVisible(false)}
        onConfirm={() => {
          setIsLogoutModalVisible(false);
          signOut();
        }}
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
    gap: Spacing.three,
  },
  loading: {
    marginTop: Spacing.five,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  studentCard: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
