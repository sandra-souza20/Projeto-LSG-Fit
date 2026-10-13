import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ConfirmLogoutModal } from '@/components/confirm-logout-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProfessionalStudents } from '@/hooks/use-professional-students';
import { useTheme } from '@/hooks/use-theme';

function lastWorkoutLabel(iso: string | null) {
  if (!iso) return 'Ainda não registrou treinos';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Treinou hoje';
  if (days === 1) return 'Treinou ontem';
  return `Último treino há ${days} dias`;
}

export default function ProfessionalStudentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { professional, signOut } = useAuth();
  const { students, isLoading, error, reload } = useProfessionalStudents();
  const [search, setSearch] = useState('');
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => student.name.toLowerCase().includes(query));
  }, [students, search]);

  const activeCount = students.filter((student) => student.workoutsLast30Days > 0).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader name={professional?.name ?? ''} onLogout={() => setIsLogoutModalVisible(true)} />

        <View style={styles.quickActions}>
          <Pressable style={styles.quickAction} onPress={() => router.push('/exercise-library')}>
            <ThemedView type="accent" style={styles.quickActionInner}>
              <ThemedText type="smallBold" themeColor="accentText">
                Biblioteca de exercícios
              </ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push('/professional-profile')}>
            <ThemedView type="card" style={[styles.quickActionInner, { borderColor: theme.border }, styles.bordered]}>
              <ThemedText type="smallBold">Meu perfil</ThemedText>
            </ThemedView>
          </Pressable>
        </View>

        <View style={styles.titleRow}>
          <ThemedText type="subtitle">Meus alunos</ThemedText>
          {students.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {activeCount}/{students.length} ativos em 30 dias
            </ThemedText>
          )}
        </View>

        {students.length > 3 && (
          <TextInput
            placeholder="Buscar aluno"
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={[
              styles.searchInput,
              { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
            ]}
          />
        )}

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
            data={filteredStudents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/student/[id]', params: { id: item.id, name: item.name } })
                }>
                <ThemedView type="card" style={[styles.studentCard, { borderColor: theme.border }]}>
                  <View style={styles.studentInfo}>
                    <ThemedText type="smallBold">{item.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {lastWorkoutLabel(item.lastWorkoutAt)}
                    </ThemedText>
                  </View>
                  <View style={styles.frequency}>
                    <ThemedText
                      style={styles.frequencyNumber}
                      themeColor={item.workoutsLast30Days > 0 ? 'accent' : 'textSecondary'}>
                      {item.workoutsLast30Days}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.frequencyLabel}>
                      treinos/30d
                    </ThemedText>
                  </View>
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
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  quickAction: {
    flex: 1,
  },
  quickActionInner: {
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
  },
  bordered: {
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
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
    paddingBottom: Spacing.four,
  },
  studentCard: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  studentInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  frequency: {
    alignItems: 'center',
  },
  frequencyNumber: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  frequencyLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
});
