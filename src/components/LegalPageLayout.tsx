"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { BackToSettingsLink } from "@/components/BackToSettingsLink";

type Contact = {
  nameLabel: string;
  nameValue: string;
  emailLabel: string;
  emailValue: string;
  phoneLabel: string;
  phoneValue: string;
  kvkLabel: string;
  kvkValue: string;
};

type Section = {
  id: string;
  title: string;
  body: string;
  highlight?: string;
  extra?: ReactNode;
};

export function LegalPageLayout({
  title,
  updated,
  introTitle,
  introBody,
  sections,
  afterSections,
  contactTitle,
  contactIntro,
  contact,
  footerNote,
  footerExtra,
}: {
  title: string;
  updated: string;
  introTitle: string;
  introBody: string;
  sections: Section[];
  afterSections?: ReactNode;
  contactTitle: string;
  contactIntro: string;
  contact: Contact;
  footerNote: string;
  footerExtra?: ReactNode;
}) {
  return (
    <AppShell>
      <article className="space-y-4 pb-4">
        <section className="hm-card px-5 py-6 text-center">
          <div className="mb-3 flex justify-end">
            <BackToSettingsLink />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[#3f6339]">
            {title}
          </h2>
          <p className="mt-2 text-base text-[#3f6339]">{updated}</p>
        </section>

        <section className="hm-card px-5 py-5">
          <h3 className="text-xl font-semibold text-[#3f6339]">{introTitle}</h3>
          <p className="mt-3 text-lg leading-relaxed text-[#3f6339]">
            {introBody}
          </p>
        </section>

        {sections.map((section) => (
          <section key={section.id} className="hm-card px-5 py-5">
            <h3 className="text-xl font-semibold text-[#3f6339]">
              {section.title}
            </h3>
            <p className="mt-3 text-lg leading-relaxed text-[#3f6339]">
              {section.body}
            </p>
            {section.highlight ? (
              <p className="mt-4 rounded-2xl border border-[#9fc2e6]/60 bg-[#eff6fd]/90 px-4 py-3 text-base leading-relaxed text-[#2a3c31]">
                {section.highlight}
              </p>
            ) : null}
            {section.extra}
          </section>
        ))}

        {afterSections}

        <section className="hm-card px-5 py-5">
          <h3 className="text-xl font-semibold text-[#3f6339]">
            {contactTitle}
          </h3>
          <p className="mt-3 text-lg leading-relaxed text-[#3f6339]">
            {contactIntro}
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                [contact.nameLabel, contact.nameValue],
                [contact.emailLabel, contact.emailValue],
                [contact.phoneLabel, contact.phoneValue],
                [contact.kvkLabel, contact.kvkValue],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[#e8dfd0] bg-white/70 px-4 py-3"
              >
                <dt className="text-sm font-bold text-[#3f6339]">{label}</dt>
                <dd className="mt-1 break-words text-base text-[#3f6339]">
                  {label === contact.emailLabel ? (
                    <a
                      href={`mailto:${value}`}
                      className="underline underline-offset-2"
                    >
                      {value}
                    </a>
                  ) : label === contact.phoneLabel ? (
                    <a
                      href={`tel:${value.replace(/\s|\(|\)/g, "")}`}
                      className="underline underline-offset-2"
                    >
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="px-2 text-center text-base text-[#3f6339]">
          {footerNote}
        </p>
        {footerExtra}
      </article>
    </AppShell>
  );
}
