import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toDateKey, useWorkoutSessions } from '@/hooks/use-workout-sessions';

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type FrequencyCalendarProps = {
  studentId?: string;
  // Rota alternativa dos treinos (ex.: visao da academia).
  sessionsPath?: string;
  // Muda a cada foco da tela para recarregar depois de finalizar um treino.
  refreshKey?: number;
};

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// RF04: frequencia do aluno no mes, com os dias treinados destacados.
export function FrequencyCalendar({ studentId, sessionsPath, refreshKey }: FrequencyCalendarProps) {
  const theme = useTheme();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const { trainedDays, isLoading, error } = useWorkoutSessions(month, studentId, refreshKey, sessionsPath);

  const today = new Date();
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = month.getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = capitalize(month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  const total = trainedDays.size;

  function shiftMonth(delta: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} accessibilityLabel="Mês anterior">
          <ThemedText type="smallBold" themeColor="accent">
            ‹
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{monthLabel}</ThemedText>
        <Pressable
          onPress={() => shiftMonth(1)}
          hitSlop={12}
          disabled={isCurrentMonth}
          accessibilityLabel="Próximo mês">
          <ThemedText type="smallBold" themeColor={isCurrentMonth ? 'textSecondary' : 'accent'}>
            ›
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <ThemedText style={styles.total} themeColor="accent">
          {total}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {total === 1 ? 'dia de treino neste mês' : 'dias de treino neste mês'}
        </ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.accent} style={styles.loading} />
      ) : error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : (
        <View>
          <View style={styles.week}>
            {WEEKDAY_INITIALS.map((initial, index) => (
              <View key={index} style={styles.cell}>
                <ThemedText type="small" themeColor="textSecondary">
                  {initial}
                </ThemedText>
              </View>
            ))}
          </View>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.week}>
              {cells.slice(row * 7, row * 7 + 7).map((day, index) => {
                if (day === null) return <View key={index} style={styles.cell} />;

                const date = new Date(month.getFullYear(), month.getMonth(), day);
                const trained = trainedDays.has(toDateKey(date));
                const isToday = isCurrentMonth && day === today.getDate();

                return (
                  <View key={index} style={styles.cell}>
                    <View
                      style={[
                        styles.dayCircle,
                        trained && { backgroundColor: theme.accent },
                        !trained && isToday && { borderColor: theme.accent, borderWidth: 1 },
                      ]}>
                      <ThemedText
                        type="small"
                        themeColor={trained ? 'accentText' : 'text'}
                        style={trained && styles.trainedText}>
                        {day}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  total: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  loading: {
    marginVertical: Spacing.four,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainedText: {
    fontWeight: '800',
  },
});
