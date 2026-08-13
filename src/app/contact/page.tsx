"use client";

import { AppShell } from "@/components/AppShell";
import { BackToSettingsLink } from "@/components/BackToSettingsLink";

const CONTACT = {
  name: 'The Oracle Pic 4 / “Hartmaatje”',
  email: "homeonline23@gmail.com",
  phone: "+31 (0)611684159",
  phoneHref: "+31611684159",
  kvk: "42056088",
} as const;

const green = "#3f6339";
const card =
  "rounded-2xl border border-[#e8dfd0] bg-white/70 px-4 py-4 text-lg";

export default function ContactPage() {
  return (
    <AppShell>
      <section className="hm-card space-y-4 px-5 py-6 pb-28">
        <div className="flex items-start justify-between gap-3">
          <h2
            className="min-w-0 flex-1 text-center font-[family-name:var(--font-display)] text-3xl font-semibold"
            style={{ color: green }}
          >
            Contact
          </h2>
          <div className="shrink-0 pt-1">
            <BackToSettingsLink />
          </div>
        </div>

        <div className={card}>
          <p className="font-semibold" style={{ color: green }}>
            Naam Bedrijfsnaam
          </p>
          <p className="mt-2 text-base font-semibold" style={{ color: green }}>
            {CONTACT.name}
          </p>
        </div>

        <div className={card}>
          <p className="font-semibold" style={{ color: green }}>
            E-mail
          </p>
          <p className="mt-2 text-base font-semibold">
            <a
              href={`mailto:${CONTACT.email}`}
              className="underline underline-offset-4"
              style={{ color: green }}
            >
              {CONTACT.email} →
            </a>
          </p>
        </div>

        <div className={card}>
          <p className="font-semibold" style={{ color: green }}>
            Telefoon
          </p>
          <p className="mt-2 text-base font-semibold">
            <a
              href={`tel:${CONTACT.phoneHref}`}
              className="underline underline-offset-4"
              style={{ color: green }}
            >
              {CONTACT.phone} →
            </a>
          </p>
        </div>

        <div className={card}>
          <p className="font-semibold" style={{ color: green }}>
            Chambers of Commerce / KvK nr
          </p>
          <p className="mt-2 text-base font-semibold" style={{ color: green }}>
            {CONTACT.kvk}
          </p>
        </div>
      </section>
    </AppShell>
  );
}
