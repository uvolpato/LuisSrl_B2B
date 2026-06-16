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
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = data as { message?: string | string[] } | null;
    let code =
      (Array.isArray(body?.message) ? body?.message[0] : body?.message) ??
      "errors.generic";
    if (res.status === 429) code = "errors.too_many_requests";
    throw new ApiError(res.status, code);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
