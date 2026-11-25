// fetch wrapper: JSON in and out. A 422 becomes per-field errors; any other
// failure becomes a plain message (UI-ERR-01).

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isValidation() {
    return this.status === 422 && Object.keys(this.fieldErrors).length > 0;
  }
}

/**
 * How the client reaches the session (auth/session.tsx): the token to send, and
 * what to do when the server says the session is over (AUTH-03). Signed out,
 * there's no token and nobody to tell.
 */
export interface SessionLink {
  token: () => Promise<string | null>;
  onUnauthorized: () => void;
}

const SIGNED_OUT: SessionLink = { token: async () => null, onUnauthorized: () => {} };
let session: SessionLink = SIGNED_OUT;

/** Connects the session; returns a function that disconnects it again. */
export function connectSession(link: SessionLink): () => void {
  session = link;
  return () => {
    if (session === link) session = SIGNED_OUT;
  };
}

async function headersFor(body: unknown, signIn: boolean): Promise<Record<string, string> | undefined> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = signIn ? null : await session.token();
  if (token) headers.Authorization = `Bearer ${token}`;
  return Object.keys(headers).length ? headers : undefined;
}

/**
 * `signIn` marks the local sign-in call: it sends no token, and its 401 means a
 * wrong password, not a session that has ended.
 */
export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  { signIn = false }: { signIn?: boolean } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: await headersFor(body, signIn),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Couldn't reach the server. Check that Accountable is running.");
  }
  if (response.status === 401 && !signIn) session.onUnauthorized();
  if (response.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    const errors = (data as { errors?: Record<string, string> } | null)?.errors ?? {};
    const message = typeof detail === 'string' ? detail : `The server answered with an error (${response.status}).`;
    throw new ApiError(response.status, message, errors);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};
