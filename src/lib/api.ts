export const apiBase =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    csrf?: string;
    key?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}/api${path}`, {
      method: options.method || "GET",
      credentials: "include",
      signal: options.signal || AbortSignal.timeout(15000),
      headers: {
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.csrf ? { "X-CSRF-Token": options.csrf } : {}),
        ...(options.key ? { "Idempotency-Key": options.key } : {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      "The server could not be reached. Your draft is still here. Please try again.",
      0,
    );
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json"))
    throw new ApiError(
      "The API server is unavailable. Start the backend or check its configured URL.",
      response.status,
    );
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.error || "This action could not be completed.",
      response.status,
    );
  return data as T;
}
