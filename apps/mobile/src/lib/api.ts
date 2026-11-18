import type { ApiError as ApiErrorBody } from '@baki/shared';
import Constants from 'expo-constants';
import { getLang, translate } from './i18n';

/**
 * API base URL. Set EXPO_PUBLIC_API_URL for a real deployment. In
 * development we fall back to the machine running the Expo dev server
 * (its LAN IP, so a physical phone can reach it) on port 4000.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:4000`;
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }

  /** First message for a field, falling back to the general message. */
  field(name: string): string | undefined {
    return this.fieldErrors?.[name]?.[0];
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called when an authenticated request comes back 401 (expired / revoked token). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Options = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown; form?: FormData };

export async function api<T>(path: string, { method = 'GET', body, form }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': getLang() };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, translate(getLang(), 'networkError'));
  }

  const data = (await res.json().catch(() => null)) as (T & ApiErrorBody) | null;
  if (!res.ok) {
    if (res.status === 401 && authToken && !path.startsWith('/auth/')) {
      onUnauthorized?.();
    }
    throw new ApiError(res.status, data?.message ?? translate(getLang(), 'genericError'), data?.fieldErrors);
  }
  return data as T;
}

/** Absolute URL for a photo path returned by the API ("/uploads/x.jpg"). */
export function photoSource(photoUrl: string | null) {
  return photoUrl ? { uri: `${API_URL}${photoUrl}` } : null;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : translate(getLang(), 'genericError');
}
