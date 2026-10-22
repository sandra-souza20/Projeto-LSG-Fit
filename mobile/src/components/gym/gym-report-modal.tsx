import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { isAbsent, type GymStudent } from '@/components/gym/gym-students-tab';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { apiRequest } from '@/services/api';
import {
  buildReportCsv,
  buildReportText,
  monthRange,
  monthTitle,
  reportFileName,
  type GymReport,
} from '@/utils/gym-report';
import { shareReportCsv, shareReportText } from '@/utils/share-report';

type GymReportModalProps = {
  visible: boolean;
  onClose: () => void;
};

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Caso de uso "Gerar Registro": relatorio mensal que a academia compartilha.
export function GymReportModal({ visible, onClose }: GymReportModalProps) {
  const theme = useTheme();
  const { gym, token } = useAuth();
  const [month, setMonth] = useState(startOfCurrentMonth);
  // Resultado da ultima busca, marcado com o mes a que pertence: enquanto o
  // mes escolhido nao bate com o carregado, a tela mostra "carregando".
  const [loaded, setLoaded] = useState<{ key: string; students?: GymStudent[]; error?: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const isCurrentMonth = month.getTime() === startOfCurrentMonth().getTime();

  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

  useEffect(() => {
    if (!visible || !token) return;

    let cancelled = false;
    const { from, to } = monthRange(month);
    apiRequest<GymStudent[]>(
      `/gyms/me/students?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      { token },
    )
      .then((result) => {
        if (!cancelled) setLoaded({ key: monthKey, students: result });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoaded({
            key: monthKey,
            error: err instanceof Error ? err.message : 'Não foi possível gerar o relatório.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, token, month, monthKey]);

  const current = loaded?.key === monthKey ? loaded : null;
  const students = current?.students ?? null;
  const error = current?.error ?? null;

  const report = useMemo<GymReport | null>(
    () =>
      students && {
        gymName: gym?.name ?? 'Academia',
        month,
        generatedAt: new Date(),
        students,
        absentCount: isCurrentMonth ? students.filter(isAbsent).length : null,
      },
    [students, gym?.name, month, isCurrentMonth],
  );
  const text = useMemo(() => (report ? buildReportText(report) : ''), [report]);

  async function share(kind: 'text' | 'csv') {
    if (!report) return;
    setIsSharing(true);
    setFeedback(null);
    try {
      const message =
        kind === 'text'
          ? await shareReportText(`Relatório ${monthTitle(month)}`, text)
          : await shareReportCsv(reportFileName(report), buildReportCsv(report));
      setFeedback(message);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Não foi possível compartilhar o relatório.');
    } finally {
      setIsSharing(false);
    }
  }

  function shiftMonth(delta: number) {
    setFeedback(null);
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView type="card" style={[styles.sheet, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            Relatório mensal
          </ThemedText>

          <View style={styles.monthRow}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} accessibilityLabel="Mês anterior">
              <ThemedText type="smallBold" themeColor="accent">
                ‹
              </ThemedText>
            </Pressable>
            <ThemedText type="smallBold">{monthTitle(month)}</ThemedText>
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

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : !report ? (
            <ActivityIndicator color={theme.accent} style={styles.loading} />
          ) : (
            <ScrollView
              style={[styles.preview, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <ThemedText type="small" style={styles.previewText}>
                {text}
              </ThemedText>
            </ScrollView>
          )}

          {feedback && (
            <ThemedText type="small" themeColor="accent">
              {feedback}
            </ThemedText>
          )}

          <View style={styles.actions}>
            <Pressable
              disabled={!report || isSharing}
              onPress={() => share('text')}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accent },
                (!report || isSharing) && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="accentText">
                Compartilhar texto
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={!report || isSharing}
              onPress={() => share('csv')}
              style={({ pressed }) => [
                styles.button,
                { borderColor: theme.border, borderWidth: 1 },
                (!report || isSharing) && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Planilha (CSV)</ThemedText>
            </Pressable>
          </View>

          <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
            <ThemedText type="small" themeColor="textSecondary">
              Fechar
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loading: {
    marginVertical: Spacing.four,
  },
  preview: {
    flexGrow: 0,
    maxHeight: 320,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  previewText: {
    fontFamily: Fonts.mono,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  closeButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.one,
  },
});
