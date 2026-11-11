import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// "Puxar para atualizar": devolve o RefreshControl pronto para passar em
// `refreshControl` de um ScrollView/FlatList. O indicador fica visivel ate a
// recarga terminar (mesmo se ela falhar).
export function usePullToRefresh(reload: () => Promise<unknown> | void) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.accent}
      colors={[theme.accent]}
      progressBackgroundColor={theme.backgroundElement}
    />
  );
}
