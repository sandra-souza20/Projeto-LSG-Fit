import * as Device from 'expo-device';
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

// Nome mostrado na tela de dispositivos conectados, ex.: "iPhone 15 - iOS 18.1".
// Vai no header X-Device-Name de toda requisicao; o servidor so o usa ao criar a sessao.
// Usa "-" em vez de "·": no Android (OkHttp) header com caractere fora do ASCII derruba a requisicao.
function resolveDeviceName() {
  const model = Device.modelName ?? Device.deviceName;
  // No Android, Device.osName pode trazer o fingerprint da build (ex.: Motorola:
  // "motorola/cybert_g_sys/cybert:16/..."), entao o nome do sistema e fixo.
  const osName = Platform.OS === 'android' ? 'Android' : Device.osName;
  const os = [osName, Device.osVersion].filter(Boolean).join(' ');
  const name = [model, os].filter(Boolean).join(' - ');
  const safe = name.replace(/[^\x20-\x7E]/g, ' ').trim();
  return safe || `Aplicativo LSG FIT (${Platform.OS})`;
}

export const DEVICE_NAME = resolveDeviceName();

export class ApiError extends Error {
  status: number;
  code?: string;
  // Segundos informados pelo servidor no header Retry-After (respostas 429).
  retryAfter?: number;

  constructor(message: string, status: number, code?: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

// Chamado quando uma requisicao autenticada recebe 401 SESSION_EXPIRED.
// O AuthProvider registra aqui o logout local, para nenhuma tela precisar tratar isso.
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

function parseRetryAfter(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, headers } = options;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Name': DEVICE_NAME,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.', 0);
  }

  // 204 (logout, encerrar sessao) nao tem corpo.
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new ApiError(
      data?.message ?? 'Algo deu errado. Tente novamente.',
      response.status,
      data?.code,
      parseRetryAfter(response.headers.get('Retry-After')),
    );

    if (token && response.status === 401 && error.code === 'SESSION_EXPIRED') {
      sessionExpiredHandler?.();
    }

    throw error;
  }

  return data as T;
}
