import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PhysicalAssessment } from '@/types/physical-assessment';

type AssessmentHistoryListProps = {
  assessments: PhysicalAssessment[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

const MEASUREMENT_LABELS: { key: keyof PhysicalAssessment; label: string; unit: string }[] = [
  { key: 'height', label: 'Altura', unit: 'cm' },
  { key: 'chest', label: 'Peito', unit: 'cm' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'hip', label: 'Quadril', unit: 'cm' },
  { key: 'arm', label: 'Braço', unit: 'cm' },
  { key: 'thigh', label: 'Coxa', unit: 'cm' },
];

export function AssessmentHistoryList({ assessments }: AssessmentHistoryListProps) {
  const theme = useTheme();

  if (assessments.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Nenhuma avaliação registrada ainda.
      </ThemedText>
    );
  }

  return (
    <View style={styles.list}>
      {assessments.map((assessment) => {
        const measurements = MEASUREMENT_LABELS.filter(({ key }) => assessment[key] != null);

        return (
          <ThemedView key={assessment.id} type="card" style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.headerRow}>
              <ThemedText type="smallBold">{formatNumber(assessment.weight)}kg</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDate(assessment.createdAt)}
              </ThemedText>
            </View>

            {measurements.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {measurements
                  .map(({ key, label, unit }) => `${label}: ${formatNumber(assessment[key] as number)}${unit}`)
                  .join(' · ')}
              </ThemedText>
            )}

            {assessment.notes && (
              <ThemedText type="small" themeColor="textSecondary">
                {assessment.notes}
              </ThemedText>
            )}
          </ThemedView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
