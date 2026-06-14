import { NextResponse } from "next/server";

export type ApiMeta = Record<string, unknown>;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export function ok<T>(data: T, meta?: ApiMeta, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data, ...(meta ? { meta } : {}) }, init);
}

export function created<T>(data: T, meta?: ApiMeta) {
  return ok(data, meta, { status: 201 });
}

export function fail(code: ErrorCode, message: string, details?: unknown) {
  return NextResponse.json<ApiError>(
    { success: false, error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status: ERROR_CODES[code] },
  );
}
