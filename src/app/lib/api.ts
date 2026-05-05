export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

function normalizePath(path: string) {
  if (!path.startsWith('/')) return `/${path}`;
  return path;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const endpoint = `${API_BASE_URL}${normalizePath(path)}`;
  const response = await fetch(endpoint, {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${method} ${endpoint} failed: ${response.status} ${response.statusText} ${text}`);
  }

  return (await response.json()) as T;
}
