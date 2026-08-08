/**
 * Client API: tutte le chiamate passano dal proxy Next (/api -> backend),
 * quindi sono same-origin e il cookie di sessione viaggia da solo.
 * Il token CSRF arriva dal login (o da /auth/me) e va su ogni mutazione.
 */
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    /** codice messaggio del backend, es. "auth.invalid_credentials" */
    public code: string,
  ) {
    super(code);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = data as { message?: string | string[] } | null;
    const rawMsg =
      (Array.isArray(body?.message) ? body?.message[0] : body?.message) ??
      `errors.HTTP ${res.status}`;
    if (res.status === 429) throw new ApiError(429, "errors.too_many_requests");
    if (!rawMsg.includes('.')) throw new ApiError(res.status, `errors.HTTP ${res.status}`);
    throw new ApiError(res.status, rawMsg);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
