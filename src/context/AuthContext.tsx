"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { logConsentAudit } from "@/lib/consent/logConsentAudit";
import { CONSENT_DOCUMENT_VERSION } from "@/lib/constants";
import {
  loadOrCreateUserProfile,
  readableProfileError,
} from "@/lib/profile/ensureUserProfile";
import { clampVoiceSpeed } from "@/lib/voice/speed";
import { normalizeVoiceIdentityId } from "@/lib/voice/legacy";
import { getSupabase, getAuthSession, isSupabaseConfigured } from "@/lib/supabase";
import type { Profile } from "@/lib/profile/types";

export type { Profile } from "@/lib/profile/types";

type ConsentPatch = {
  voice: boolean;
  memory: boolean;
  analytics: boolean;
  cloud: boolean;
};

type ProfilePatch = Partial<
  Pick<
    Profile,
    | "display_name"
    | "address_form"
    | "tts_preset_id"
    | "tts_playback_rate"
    | "message_retention_days"
  >
>;

type AuthContextValue = {
  supabaseConfigured: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  authLoading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    error?: string;
    needsEmailConfirmation?: boolean;
    userId?: string;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markIntroSeen: () => Promise<{ error?: string }>;
  saveConsent: (opts: ConsentPatch) => Promise<{ error?: string }>;
  updateProfileFields: (patch: ProfilePatch) => Promise<{ error?: string }>;
  setConsentAccountTimestamp: (
    userIdOverride?: string,
  ) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const client = useMemo(() => getSupabase(), []);

  const refreshProfile = useCallback(async () => {
    if (!client || !session?.user?.id) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    const result = await loadOrCreateUserProfile(client, session.user.id);
    setProfileLoading(false);
    if (result.error || !result.profile) {
      setProfileError(
        readableProfileError(result.error ?? "Profiel kon niet worden geladen."),
      );
      setProfile(null);
      return;
    }
    setProfile(result.profile);
  }, [client, session]);

  useEffect(() => {
    if (!client) {
      setSession(null);
      setAuthLoading(false);
      return;
    }
    let mounted = true;
    void getAuthSession(client).then((nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!session?.user?.id || !client) {
      setProfile(null);
      return;
    }
    void refreshProfile();
  }, [client, refreshProfile, session?.user?.id]);

  const signIn = async (email: string, password: string) => {
    if (!client) return { error: "Supabase is niet geconfigureerd." };
    const { error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? { error: readableAuthError(error.message) } : {};
  };

  const signUp = async (email: string, password: string) => {
    if (!client) return { error: "Supabase is niet geconfigureerd." };
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) return { error: readableAuthError(error.message) };
    const needsEmailConfirmation = Boolean(
      data.session == null && data.user != null,
    );
    return { needsEmailConfirmation, userId: data.user?.id };
  };

  const signOut = async () => {
    if (!client) return;
    await client.auth.signOut();
    setProfile(null);
  };

  const setConsentAccountTimestamp = async (userIdOverride?: string) => {
    if (!client) return { error: "Supabase ontbreekt." };
    const uid = userIdOverride ?? session?.user?.id;
    if (!uid) return { error: "Geen sessie." };
    const now = new Date().toISOString();
    const logged = await logConsentAudit(client, uid, [
      { kind: "account", granted: true },
    ]);
    if (logged.error) return { error: logged.error };
    const { error } = await client
      .from("profiles")
      .update({
        consent_account_at: now,
        consent_document_version: CONSENT_DOCUMENT_VERSION,
      })
      .eq("id", uid);
    if (error) return { error: error.message };
    await refreshProfile();
    return {};
  };

  const markIntroSeen = async () => {
    if (!client || !session?.user?.id) return { error: "Geen sessie." };
    const { error } = await client
      .from("profiles")
      .update({ intro_seen_at: new Date().toISOString() })
      .eq("id", session.user.id);
    if (error) return { error: error.message };
    await refreshProfile();
    return {};
  };

  const saveConsent = async (opts: ConsentPatch) => {
    if (!client || !session?.user?.id) return { error: "Geen sessie." };
    if (!opts.voice || !opts.memory) {
      return {
        error:
          "Spraakverwerking en geheugen zijn nodig voor de volledige ervaring.",
      };
    }
    const now = new Date().toISOString();
    const logged = await logConsentAudit(client, session.user.id, [
      { kind: "voice", granted: opts.voice },
      { kind: "memory", granted: opts.memory },
      { kind: "analytics", granted: opts.analytics },
      { kind: "cloud_processing", granted: opts.cloud },
    ]);
    if (logged.error) return { error: logged.error };
    const { error } = await client
      .from("profiles")
      .update({
        consent_voice_at: opts.voice ? now : null,
        consent_memory_at: opts.memory ? now : null,
        consent_analytics_at: opts.analytics ? now : null,
        consent_cloud_at: opts.cloud ? now : null,
        consents_completed_at: now,
        consent_document_version: CONSENT_DOCUMENT_VERSION,
      })
      .eq("id", session.user.id);
    if (error) return { error: error.message };
    await refreshProfile();
    return {};
  };

  const updateProfileFields = async (patch: ProfilePatch) => {
    if (!client || !session?.user?.id) return { error: "Geen sessie." };
    const updates: Record<string, string | null | number> = {};
    if (patch.display_name !== undefined) {
      const v = patch.display_name;
      updates.display_name = !v || v.trim() === "" ? null : v.trim();
    }
    if (patch.address_form !== undefined)
      updates.address_form = patch.address_form;
    if (patch.tts_preset_id !== undefined) {
      const preset = patch.tts_preset_id;
      updates.tts_preset_id =
        preset == null || preset.trim() === ""
          ? null
          : normalizeVoiceIdentityId(preset.trim());
    }
    if (patch.tts_playback_rate !== undefined && patch.tts_playback_rate != null) {
      updates.tts_playback_rate = clampVoiceSpeed(patch.tts_playback_rate);
    }
    if (patch.message_retention_days !== undefined) {
      const v = patch.message_retention_days;
      updates.message_retention_days =
        v == null ? null : Math.min(2555, Math.max(90, Math.round(Number(v))));
    }
    const { error } = await client
      .from("profiles")
      .update(updates)
      .eq("id", session.user.id);
    if (error) return { error: error.message };
    await refreshProfile();
    return {};
  };

  const value: AuthContextValue = {
    supabaseConfigured: isSupabaseConfigured,
    session,
    user: session?.user ?? null,
    profile,
    authLoading,
    profileLoading,
    profileError,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    markIntroSeen,
    saveConsent,
    updateProfileFields,
    setConsentAccountTimestamp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth moet binnen AuthProvider gebruikt worden");
  return ctx;
}

function readableAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Onjuist e-mailadres of wachtwoord.";
  if (m.includes("email not confirmed"))
    return "Bevestig eerst uw e-mailadres via de link die we u hebben gestuurd.";
  if (m.includes("user already registered"))
    return "Dit e-mailadres is al geregistreerd. Probeer in te loggen.";
  if (m.includes("password"))
    return "Controleer uw wachtwoord (minimaal 8 tekens).";
  return "Er ging iets mis. Probeer het opnieuw.";
}
