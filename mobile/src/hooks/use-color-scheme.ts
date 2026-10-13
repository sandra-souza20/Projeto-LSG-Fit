import { useThemePreference } from '@/contexts/theme-context';

// O tema vem da preferencia salva no app (RF01), nao do tema do sistema.
export function useColorScheme() {
  return useThemePreference().colorScheme;
}
