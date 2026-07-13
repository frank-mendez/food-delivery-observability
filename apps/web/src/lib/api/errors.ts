export type ApiErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 0);
  }

  return new ApiError('Something went wrong', 0);
}

export function messageFromPayload(payload: ApiErrorPayload | undefined) {
  if (!payload?.message) {
    return payload?.error ?? 'Request failed';
  }

  return Array.isArray(payload.message)
    ? payload.message.join(', ')
    : payload.message;
}
