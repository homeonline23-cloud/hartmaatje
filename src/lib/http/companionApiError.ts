import type { RateLimitMeta } from "@/lib/geminiErrors";

export type CompanionApiErrorMeta = RateLimitMeta & {
  status: number;
};

/** API-fout met optionele rate-limit metadata voor de UI. */
export class CompanionApiError extends Error {
  readonly meta: CompanionApiErrorMeta;

  constructor(message: string, meta: CompanionApiErrorMeta) {
    super(message);
    this.name = "CompanionApiError";
    this.meta = meta;
  }
}

export function parseApiErrorResponse(
  res: Response,
  data: Record<string, unknown>,
  fallbackMessage: string,
): CompanionApiError {
  const message =
    typeof data.error === "string" && data.error.trim()
      ? data.error
      : fallbackMessage;
  return new CompanionApiError(message, {
    status: res.status,
    quotaExceeded: data.quotaExceeded === true,
    retryAfterMs:
      typeof data.retryAfterMs === "number" ? data.retryAfterMs : undefined,
    resetAt: typeof data.resetAt === "string" ? data.resetAt : null,
    resetHint: typeof data.resetHint === "string" ? data.resetHint : undefined,
  });
}

export function isCompanionApiError(err: unknown): err is CompanionApiError {
  return err instanceof CompanionApiError;
}
