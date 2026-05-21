let baseUrl: string | null = null;
let authTokenGetter: AuthTokenGetter | null = null;

export type AuthTokenGetter = () => string | null;

export type ErrorType<E> = E & { status?: number; data?: unknown };
export type BodyType<B> = B;

export function setBaseUrl(url: string | null): void {
  baseUrl = url;
}

export function setAuthTokenGetter(getter: AuthTokenGetter): void {
  authTokenGetter = getter;
}

export const customFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const token = authTokenGetter ? authTokenGetter() : localStorage.getItem('crypto_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fullUrl = baseUrl ? `${baseUrl}${url}` : url;
  const response = await fetch(fullUrl, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw Object.assign(new Error(errorData.error || response.statusText), { status: response.status, data: errorData });
  }
  return response.json();
};
