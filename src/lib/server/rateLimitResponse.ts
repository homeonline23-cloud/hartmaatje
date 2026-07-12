import { NextResponse } from "next/server";
import type { AppLang } from "@/lib/languages";
import {
  buildRateLimitMeta,
  friendlyGeminiErrorMessage,
  isGeminiQuotaError,
  type RateLimitMeta,
} from "@/lib/geminiErrors";

export function jsonApiError(
  raw: string,
  lang: AppLang,
  status = 500,
  companionName = "Fenna",
): NextResponse {
  const quota = isGeminiQuotaError(raw);
  const meta: RateLimitMeta = quota
    ? buildRateLimitMeta(lang, true)
    : buildRateLimitMeta(lang, false);
  const message = friendlyGeminiErrorMessage(
    raw,
    lang,
    companionName,
    meta.resetHint,
  );

  return NextResponse.json(
    {
      error: message,
      quotaExceeded: quota,
      ...meta,
    },
    {
      status: quota ? 429 : status,
      headers: meta.retryAfterMs
        ? { "Retry-After": String(Math.ceil(meta.retryAfterMs / 1000)) }
        : undefined,
    },
  );
}
