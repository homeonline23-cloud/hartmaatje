-- Vaste consent_audit.kind waarden (Chapter 2 — consent enums)
alter table public.consent_audit drop constraint if exists consent_audit_kind_ok;

alter table public.consent_audit add constraint consent_audit_kind_ok check (
  kind in (
    'account',
    'voice',
    'memory',
    'analytics',
    'cloud_processing'
  )
);
