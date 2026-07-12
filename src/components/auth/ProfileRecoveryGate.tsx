"use client";

import { useState, type ReactNode } from "react";

import { AppPagePanel } from "@/components/AppPagePanel";
import { Card, ErrorBanner, PrimaryButton, TextLink } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export function ProfileRecoveryGate({ children }: { children: ReactNode }) {
  const {
    user,
    profile,
    authLoading,
    profileLoading,
    profileError,
    refreshProfile,
    signOut,
  } = useAuth();
  const { app } = useLanguage();
  const copy = app.profileRecovery;
  const [retryBusy, setRetryBusy] = useState(false);

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-xl text-[#5c4a32]">{app.common.loading}</p>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <AppPagePanel title={copy.title} intro={copy.intro}>
        <Card>
          <p className="text-xl leading-relaxed text-[#5c4a32]">
            {copy.detail}
          </p>
          <ErrorBanner message={profileError} />
          <div className="mt-5 space-y-3">
            <PrimaryButton
              label={retryBusy ? copy.retryBusy : copy.retry}
              disabled={retryBusy}
              onClick={() => {
                setRetryBusy(true);
                void refreshProfile().finally(() => setRetryBusy(false));
              }}
            />
            <PrimaryButton
              label={copy.signOut}
              variant="outline"
              disabled={retryBusy}
              onClick={() => void signOut()}
            />
          </div>
          <p className="mt-5 text-lg text-[#5c4a32]">
            <TextLink href="/">{copy.homeLink}</TextLink>
          </p>
          <p className="mt-2 text-base text-[#7a6a52]">{copy.homeHint}</p>
        </Card>
      </AppPagePanel>
    );
  }

  return children;
}
