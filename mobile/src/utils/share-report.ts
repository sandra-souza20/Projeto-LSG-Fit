import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

// Compartilha o relatorio pelos canais do aparelho (WhatsApp, e-mail...).
// No navegador nao ha menu de compartilhar de arquivos: o texto e copiado e o
// CSV e baixado. Retorna uma mensagem curta para mostrar na tela.

export async function shareReportText(title: string, text: string): Promise<string | null> {
  if (Platform.OS !== 'web') {
    await Share.share({ title, message: text });
    return null;
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text });
      return null;
    } catch {
      // Cancelado ou nao suportado: cai para a copia.
    }
  }

  await navigator.clipboard.writeText(text);
  return 'Relatório copiado. É só colar no WhatsApp ou no e-mail.';
}

export async function shareReportCsv(fileName: string, csv: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return 'Planilha baixada.';
  }

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csv);

  if (!(await Sharing.isAvailableAsync())) {
    return 'Este aparelho não permite compartilhar arquivos.';
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Compartilhar planilha',
  });
  return null;
}
