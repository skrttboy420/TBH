import type { ApiError, ApiSuccess } from "@/lib/api/response";

/** Browser-side fetch that unwraps the `{ success, data }` envelope or throws. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  let body: ApiSuccess<T> | ApiError | null = null;
  try {
    body = (await res.json()) as ApiSuccess<T> | ApiError;
  } catch {
    // non-JSON response
  }

  if (!res.ok || !body || body.success === false) {
    const msg =
      body && body.success === false
        ? body.error.message
        : `เกิดข้อผิดพลาด (${res.status})`;
    throw new Error(msg);
  }

  return body.data;
}
