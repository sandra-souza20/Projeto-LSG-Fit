import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Guarda so o token da sessao; o papel (aluno ou profissional) vem do GET /users/me.
// No celular fica no Keychain/Keystore (expo-secure-store). A versao web, usada
// so em desenvolvimento, nao tem SecureStore e cai no localStorage.
const TOKEN_KEY = 'lsgfit.token';

const isWeb = Platform.OS === 'web';

export async function getStoredToken(): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(TOKEN_KEY, token);
    } catch {
      // Sem armazenamento no navegador: a sessao dura so ate recarregar a pagina.
    }
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
    } catch {
      // Nada a limpar.
    }
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
}
