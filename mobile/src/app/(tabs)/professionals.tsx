import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProfessionals, type ProfessionalSummary } from '@/hooks/use-professionals';
import { useTheme } from '@/hooks/use-theme';
import { callPhone, formatPhone, openWhatsApp, sendEmail } from '@/utils/contact';

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

// RF05: o aluno ve os perfis dos profissionais e o numero para contato.
export default function ProfessionalsScreen() {
  const theme = useTheme();
  const { user, linkProfessional } = useAuth();
  const { professionals, isLoading, error } = useProfessionals();
  const [search, setSearch] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? professionals.filter((professional) =>
          [professional.name, professional.specialty, professional.gym?.name]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query)),
        )
      : professionals;

    // O profissional vinculado ao aluno aparece primeiro.
    return [...list].sort(
      (a, b) => Number(b.id === user?.professionalId) - Number(a.id === user?.professionalId),
    );
  }, [professionals, search, user?.professionalId]);

  async function handleLink(professional: ProfessionalSummary) {
    setLinkingId(professional.id);
    setLinkError(null);
    try {
      await linkProfessional(professional.id);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Não foi possível vincular o profissional.');
    } finally {
      setLinkingId(null);
    }
  }

  return (
    <Screen title="Profissionais" withTabBar>
      <ThemedText type="small" themeColor="textSecondary">
        Encontre um personal, veja a especialidade e entre em contato direto pelo WhatsApp ou telefone.
      </ThemedText>

      <TextInput
        placeholder="Buscar por nome, especialidade ou academia"
        placeholderTextColor={theme.textSecondary}
        value={search}
        onChangeText={setSearch}
        style={[
          styles.searchInput,
          { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
        ]}
      />

      {linkError && (
        <ThemedText type="small" themeColor="danger">
          {linkError}
        </ThemedText>
      )}

      {isLoading ? (
        <ActivityIndicator color={theme.accent} style={styles.loading} />
      ) : error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : filtered.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nenhum profissional encontrado.
        </ThemedText>
      ) : (
        filtered.map((professional) => {
          const isMine = professional.id === user?.professionalId;

          return (
            <ThemedView
              key={professional.id}
              type="card"
              style={[styles.card, { borderColor: isMine ? theme.accent : theme.border }]}>
              <View style={styles.headerRow}>
                <ThemedView type="accent" style={styles.avatar}>
                  <ThemedText type="smallBold" themeColor="accentText">
                    {getInitials(professional.name)}
                  </ThemedText>
                </ThemedView>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{professional.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {professional.specialty ?? 'Personal trainer'}
                    {professional.gym ? ` · ${professional.gym.name}` : ''}
                  </ThemedText>
                </View>
                {isMine && (
                  <ThemedView type="accent" style={styles.badge}>
                    <ThemedText type="small" themeColor="accentText" style={styles.badgeText}>
                      Seu
                    </ThemedText>
                  </ThemedView>
                )}
              </View>

              {professional.bio && <ThemedText type="small">{professional.bio}</ThemedText>}

              <ThemedText type="small" themeColor="textSecondary">
                {professional.studentsCount} {professional.studentsCount === 1 ? 'aluno' : 'alunos'}
                {professional.phone ? ` · ${formatPhone(professional.phone)}` : ' · telefone não informado'}
              </ThemedText>

              <View style={styles.actions}>
                {professional.phone && (
                  <>
                    <Pressable
                      onPress={() =>
                        openWhatsApp(professional.phone!, `Olá, ${professional.name}! Te encontrei pelo LSG FIT.`)
                      }
                      style={({ pressed }) => [styles.action, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
                      <ThemedText type="smallBold" themeColor="accentText">
                        WhatsApp
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => callPhone(professional.phone!)}
                      style={({ pressed }) => [styles.action, { borderColor: theme.border }, styles.outlined, pressed && styles.pressed]}>
                      <ThemedText type="smallBold">Ligar</ThemedText>
                    </Pressable>
                  </>
                )}
                <Pressable
                  onPress={() => sendEmail(professional.email)}
                  style={({ pressed }) => [styles.action, { borderColor: theme.border }, styles.outlined, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">E-mail</ThemedText>
                </Pressable>
              </View>

              {!isMine && (
                <Pressable
                  hitSlop={8}
                  disabled={linkingId !== null}
                  onPress={() => handleLink(professional)}>
                  <ThemedText type="link" themeColor="accent">
                    {linkingId === professional.id ? 'Vinculando...' : 'Escolher como meu profissional'}
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  action: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  outlined: {
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
