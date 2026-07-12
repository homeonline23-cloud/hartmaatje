export type RetryFetchOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Standaard: 429 (kort), 502–504. Dagquota (>1 uur) niet opnieuw proberen. */
  shouldRetry?: (res: Response, body: Record<string, unknown>) => boolean;
  signal?: AbortSignal;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function delayForAttempt(
  attempt: number,
  res: Response,
  body: Record<string, unknown>,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const retryAfterMs = typeof body.retryAfterMs === "number" ? body.retryAfterMs : 0;
  if (retryAfterMs > 0 && retryAfterMs <= maxDelayMs) {
    return retryAfterMs;
  }
  const header = res.headers.get("Retry-After");
  if (header) {
    const sec = parseInt(header, 10);
    if (!Number.isNaN(sec)) {
      return Math.min(maxDelayMs, sec * 1000);
    }
  }
  const exp = baseDelayMs * 2 ** attempt;
  return Math.min(maxDelayMs, exp);
}

const defaultShouldRetry = (res: Response, body: Record<string, unknown>): boolean => {
  if (res.status >= 502 && res.status <= 504) return true;
  if (res.status !== 429) return false;
  if (body.quotaExceeded === true) {
    const wait = typeof body.retryAfterMs === "number" ? body.retryAfterMs : 0;
    return wait > 0 && wait < 60 * 60 * 1000;
  }
  return true;
};

/** Rustige retry met exponential backoff bij tijdelijke server-/rate-limit problemen. */
export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryFetchOptions,
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 700;
  const maxDelayMs = options?.maxDelayMs ?? 12_000;
  const shouldRetry = options?.shouldRetry ?? defaultShouldRetry;
  const signal = options?.signal ?? init?.signal ?? undefined;

  let lastRes: Response | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(input, { ...init, signal });
    lastRes = res;

    if (res.ok) return res;

    let body: Record<string, unknown> = {};
    try {
      body = (await res.clone().json()) as Record<string, unknown>;
    } catch {
      /* geen json */
    }

    const isLast = attempt >= maxAttempts - 1;
    if (isLast || !shouldRetry(res, body)) return res;

    const wait = delayForAttempt(attempt, res, body, baseDelayMs, maxDelayMs);
    await sleep(wait, signal);
  }

  return lastRes!;
}
