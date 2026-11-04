import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ConfirmModal } from '@/components/confirm-modal';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSessions } from '@/hooks/use-sessions';
import { useTheme } from '@/hooks/use-theme';
import type { SessionListItem } from '@/types/user';

// O app manda o nome do aparelho (X-Device-Name); sessoes abertas de outro jeito
// so tem o que o servidor identificou pelo User-Agent.
function deviceLabel(session: SessionListItem) {
  if (session.deviceName) return session.deviceName;
  const parts = [session.device.browser, session.device.os].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Dispositivo desconhecido';
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  return `em ${new Date(iso).toLocaleDateString('pt-BR')}`;
}

type PendingConfirm = 'current' | 'all' | null;

export default function DevicesScreen() {
  const theme = useTheme();
  const { role, signOut, signOutAllDevices } = useAuth();
  const { sessions, isLoading, error, reload, revoke } = useSessions();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function handleRevoke(session: SessionListItem) {
    setActionError(null);

    if (session.current) {
      setConfirmError(null);
      setPendingConfirm('current');
      return;
    }

    setRevokingId(session.id);
    try {
      await revoke(session.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível encerrar a sessão.');
    } finally {
      setRevokingId(null);
    }
  }

  async function handleConfirm() {
    setIsConfirming(true);
    setConfirmError(null);
    try {
      // Os dois caminhos derrubam a sessao atual: o layout raiz volta para o login.
      if (pendingConfirm === 'all') {
        await signOutAllDevices();
      } else {
        await signOut();
      }
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Não foi possível encerrar as sessões.');
      setIsConfirming(false);
    }
  }

  function closeConfirm() {
    setPendingConfirm(null);
    setConfirmError(null);
  }

  return (
    <>
      <Screen title="Dispositivos conectados" backLabel={role === 'PROFESSIONAL' ? 'Meu perfil' : 'Perfil'}>
        <ThemedText type="small" themeColor="textSecondary">
          Aparelhos em que sua conta está conectada. Encerre os que você não reconhece.
        </ThemedText>

        {actionError && (
          <ThemedText type="small" themeColor="danger">
            {actionError}
          </ThemedText>
        )}

        {isLoading ? (
          <ActivityIndicator color={theme.accent} style={styles.loading} />
        ) : error ? (
          <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
            <Pressable hitSlop={8} onPress={reload}>
              <ThemedText type="link" themeColor="accent">
                Tentar novamente
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : sessions.length === 0 ? (
          <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Nenhum dispositivo conectado.
            </ThemedText>
          </ThemedView>
        ) : (
          sessions.map((session) => (
            <ThemedView
              key={session.id}
              type="card"
              style={[styles.card, { borderColor: session.current ? theme.accent : theme.border }]}>
              <View style={styles.row}>
                <View style={styles.info}>
                  <ThemedText type="smallBold">{deviceLabel(session)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    IP {session.ip}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {session.current ? 'Ativo agora' : `Último acesso ${relativeTime(session.lastActiveAt)}`}
                  </ThemedText>
                </View>
                {session.current && (
                  <ThemedView type="accent" style={styles.badge}>
                    <ThemedText type="small" themeColor="accentText" style={styles.badgeText}>
                      Este dispositivo
                    </ThemedText>
                  </ThemedView>
                )}
              </View>

              <Pressable
                hitSlop={8}
                disabled={revokingId !== null}
                onPress={() => handleRevoke(session)}
                style={styles.revoke}>
                <ThemedText type="link" themeColor="danger">
                  {revokingId === session.id ? 'Encerrando...' : 'Encerrar'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          ))
        )}

        {!isLoading && !error && sessions.length > 0 && (
          <PrimaryButton
            label="Sair de todos os dispositivos"
            variant="secondary"
            onPress={() => {
              setConfirmError(null);
              setPendingConfirm('all');
            }}
          />
        )}
      </Screen>

      <ConfirmModal
        visible={pendingConfirm !== null}
        title={pendingConfirm === 'all' ? 'Sair de todos os dispositivos' : 'Encerrar esta sessão'}
        message={
          pendingConfirm === 'all'
            ? 'Todas as sessões da sua conta serão encerradas, inclusive a deste aparelho. Você precisará entrar novamente.'
            : 'Você vai sair da conta neste aparelho.'
        }
        confirmLabel={pendingConfirm === 'all' ? 'Sair de todos' : 'Encerrar'}
        isSubmitting={isConfirming}
        error={confirmError}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: Spacing.five,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontWeight: '700',
  },
  revoke: {
    alignSelf: 'flex-start',
  },
});
