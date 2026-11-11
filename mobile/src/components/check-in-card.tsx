import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CheckInToday } from '@/types/check-in';

type CheckInCardProps = {
  today: CheckInToday;
  isSubmitting: boolean;
  error: string | null;
  onRequest: () => void;
  onCancel: () => void;
};

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Check-in na academia antes do treino: pedido no app, aprovado ou negado
// pela academia no painel web.
export function CheckInCard({ today, isSubmitting, error, onRequest, onCancel }: CheckInCardProps) {
  const theme = useTheme();
  const { checkIn, inactive, gym } = today;

  let title = 'Check-in';
  let message = `Faça o check-in na ${gym?.name ?? 'academia'} para liberar o treino de hoje.`;
  let tone: 'text' | 'accent' | 'danger' | 'textSecondary' = 'textSecondary';
  let action: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' } | null = {
    label: 'Fazer check-in',
    onPress: onRequest,
  };

  if (inactive) {
    title = 'Matrícula inativa';
    message = `Motivo: ${inactive.reason ?? 'não informado'}. Fale com a sua academia para reativar.`;
    tone = 'danger';
    action = null;
  } else if (checkIn?.status === 'PENDING') {
    title = 'Aguardando aprovação';
    message = `Pedido enviado às ${time(checkIn.requestedAt)}. Assim que a academia aprovar, o treino é liberado.`;
    tone = 'text';
    action = { label: 'Cancelar check-in', onPress: onCancel, variant: 'secondary' };
  } else if (checkIn?.status === 'APPROVED' && !checkIn.used) {
    title = 'Check-in aprovado ✓';
    message = `Aprovado às ${time(checkIn.decidedAt ?? checkIn.requestedAt)}${
      checkIn.decidedBy ? ` por ${checkIn.decidedBy.name}` : ''
    }. Bom treino!`;
    tone = 'accent';
    action = null;
  } else if (checkIn?.status === 'DENIED') {
    title = 'Check-in negado';
    message = checkIn.denialReason ? `Motivo: ${checkIn.denialReason}` : 'A academia não aprovou o seu check-in.';
    tone = 'danger';
    action = { label: 'Pedir de novo', onPress: onRequest };
  } else if (checkIn?.status === 'EXPIRED') {
    title = 'Check-in expirou';
    message = 'A academia não respondeu em 15 minutos. Peça de novo.';
    action = { label: 'Pedir de novo', onPress: onRequest };
  }

  return (
    <ThemedView type="card" style={[styles.card, { borderColor: tone === 'accent' ? theme.accent : theme.border }]}>
      <View style={styles.texts}>
        <ThemedText type="smallBold" themeColor={tone === 'textSecondary' ? 'text' : tone}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      </View>
      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
      {action && (
        <PrimaryButton
          label={action.label}
          variant={action.variant ?? 'primary'}
          isLoading={isSubmitting}
          onPress={action.onPress}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  texts: {
    gap: Spacing.one,
  },
});
