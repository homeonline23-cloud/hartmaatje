export type Profile = {
  id: string;
  display_name: string | null;
  address_form: "formeel" | "informeel";
  partner_avatar_path: string | null;
  tts_preset_id: string | null;
  tts_playback_rate: number | null;
  intro_seen_at: string | null;
  consent_account_at: string | null;
  consent_voice_at: string | null;
  consent_memory_at: string | null;
  consent_analytics_at: string | null;
  consent_cloud_at: string | null;
  consents_completed_at: string | null;
  consent_document_version: string;
  message_retention_days: number | null;
};
