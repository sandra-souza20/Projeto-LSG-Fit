import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL in a .env file to point at a different server.
// Defaults are for the server running locally on port 3333.
function resolveApiUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  return Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://localhost:3333';
}

export const API_URL = resolveApiUrl();

// Midias da biblioteca padrao vem como caminho relativo ("/media/...") e sao
// servidas pelo proprio servidor; links cadastrados pelo profissional ja sao completos.
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.', 0);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Algo deu errado. Tente novamente.', response.status, data?.code);
  }

  return data as T;
}
