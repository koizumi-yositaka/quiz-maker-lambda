// layers/common/src/errors.ts
export type ErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown, cause?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    if (cause) (this as any).cause = cause;
  }
}

export const isHttpError = (e: unknown): e is HttpError =>
  !!e && typeof e === 'object' && 'status' in e && 'code' in e;

// 4xx
export const badRequest = (message = 'Bad Request', details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Unauthorized', details?: unknown) =>
  new HttpError(401, 'UNAUTHORIZED', message, details);
export const forbidden = (message = 'Forbidden', details?: unknown) =>
  new HttpError(403, 'FORBIDDEN', message, details);
export const notFound = (message = 'Not Found', details?: unknown) =>
  new HttpError(404, 'NOT_FOUND', message, details);
export const conflict = (message = 'Conflict', details?: unknown) =>
  new HttpError(409, 'CONFLICT', message, details);
export const unprocessable = (message = 'Unprocessable Entity', details?: unknown) =>
  new HttpError(422, 'UNPROCESSABLE_ENTITY', message, details);

// 5xx
export const internal = (message = 'Internal Server Error', details?: unknown, cause?: unknown) =>
  new HttpError(500, 'INTERNAL_ERROR', message, details, cause);