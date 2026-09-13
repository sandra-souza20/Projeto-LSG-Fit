import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddAssessmentModal } from '@/components/physical-assessment/add-assessment-modal';
import { AssessmentHistoryList } from '@/components/physical-assessment/assessment-history-list';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePhysicalAssessments } from '@/hooks/use-physical-assessments';
import type { PhysicalAssessmentInput } from '@/types/physical-assessment';

export default function PhysicalAssessmentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { assessments, isLoading, error, addAssessment } = usePhysicalAssessments();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleConfirm(input: PhysicalAssessmentInput) {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await addAssessment(input);
      setIsModalVisible(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar a avaliação.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <ThemedText type="link" themeColor="accent">
            ← Voltar
          </ThemedText>
        </Pressable>

        <ThemedText type="subtitle">Avaliação física</ThemedText>

        <PrimaryButton label="Registrar avaliação" onPress={() => setIsModalVisible(true)} />

        {isLoading ? (
          <ActivityIndicator color={theme.accent} style={styles.loading} />
        ) : error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <AssessmentHistoryList assessments={assessments} />
          </ScrollView>
        )}
      </SafeAreaView>

      <AddAssessmentModal
        visible={isModalVisible}
        isSubmitting={isSubmitting}
        serverError={formError}
        onClose={() => {
          setIsModalVisible(false);
          setFormError(null);
        }}
        onConfirm={handleConfirm}
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
    gap: Spacing.three,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  loading: {
    marginTop: Spacing.five,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
});
