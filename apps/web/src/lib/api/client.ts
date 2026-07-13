import { ApiError, messageFromPayload, type ApiErrorPayload } from './errors';

const DEFAULT_BASE_URL = '/api/backend';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
};

function resolveBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;
}

function buildUrl(path: string) {
  const baseUrl = resolveBaseUrl().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function apiFetch<T>(
  path: string,
  { body, token, headers, ...init }: ApiRequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  requestHeaders.set('x-request-id', createRequestId());

  let requestBody: BodyInit | undefined;

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    body: requestBody,
    headers: requestHeaders,
    cache: init.cache ?? 'no-store',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    const errorPayload =
      typeof payload === 'object' && payload !== null
        ? (payload as ApiErrorPayload)
        : undefined;

    throw new ApiError(
      messageFromPayload(errorPayload),
      response.status,
      errorPayload,
    );
  }

  return payload as T;
}
