/** Vaste toestemmings-soorten — houd in sync met consent_audit.kind CHECK in Supabase. */
export const CONSENT_KINDS = [
  "account",
  "voice",
  "memory",
  "analytics",
  "cloud_processing",
] as const;

export type ConsentKind = (typeof CONSENT_KINDS)[number];

export type ConsentLogRow = {
  kind: ConsentKind;
  granted: boolean;
};

const CONSENT_KIND_SET = new Set<string>(CONSENT_KINDS);

export function isConsentKind(value: string): value is ConsentKind {
  return CONSENT_KIND_SET.has(value);
}

/** Voor SQL CHECK-constraint in migraties. */
export const CONSENT_KINDS_SQL_LIST = CONSENT_KINDS.map((k) => `'${k}'`).join(
  ", ",
);
