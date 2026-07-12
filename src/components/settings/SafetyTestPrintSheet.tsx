"use client";

import Link from "next/link";
import {
  casesByCategory,
  SAFETY_CATEGORY_LABELS_NL,
  SAFETY_CHARACTER_IDS,
  SAFETY_CHARACTER_LABELS_NL,
  SAFETY_IDENTITY_LINE_NL,
  SAFETY_TEST_MATRIX_NL,
  type SafetyCategory,
} from "@/lib/companion/safetyTestMatrix";
import { useLanguage } from "@/context/LanguageContext";

const CATEGORY_ORDER: SafetyCategory[] = [
  "crisis",
  "confusion",
  "medical",
  "normal",
  "dependency",
];

function CheckCells() {
  return (
    <>
      {SAFETY_CHARACTER_IDS.map((id) => (
        <td key={id} className="border border-[#999] px-1 py-1.5 text-center text-xs align-top">
          ☐ OK
          <br />
          ☐ NOK
        </td>
      ))}
    </>
  );
}

export function SafetyTestPrintSheet() {
  const { app, lang } = useLanguage();
  const copy = app.settings.safetyTest;
  const today = new Date().toLocaleDateString(lang === "en" ? "en-GB" : "nl-NL");

  const onPrint = () => {
    window.print();
  };

  return (
    <div className="safety-print-root">
      <div className="no-print mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onPrint}
          className="rounded-2xl border-2 border-[#4a6741] bg-[#4a6741] px-5 py-3 text-lg font-semibold text-white"
        >
          {copy.printButton}
        </button>
        <Link
          href="/app/instellingen"
          className="rounded-2xl border-2 border-[#d8ccb8] bg-white px-5 py-3 text-lg font-semibold text-[#2c2416]"
        >
          {copy.backToSettings}
        </Link>
      </div>

      <article className="print-sheet rounded-2xl border border-[#d8ccb8] bg-white p-4 text-[#1a1a1a] sm:p-6">
        <header className="mb-4 border-b border-[#ccc] pb-3">
          <h1 className="text-2xl font-bold">{copy.sheetTitle}</h1>
          <p className="mt-1 text-sm text-[#444]">{copy.sheetSubtitle}</p>
          <p className="mt-2 text-xs text-[#666]">
            {copy.dateLabel}: {today} · HartMaatje
          </p>
        </header>

        <section className="mb-4 text-sm leading-snug">
          <h2 className="mb-1 font-bold">{copy.howToHeading}</h2>
          <ol className="list-decimal space-y-0.5 pl-5">
            {copy.howToSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-2 font-medium">{copy.redFlagsHeading}</p>
          <ul className="list-disc pl-5">
            {copy.redFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </section>

        <section className="mb-4 overflow-x-auto">
          <h2 className="mb-2 font-bold">{copy.scoreHeading}</h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#f0f0f0]">
                <th className="border border-[#999] px-2 py-1 text-left">{copy.tableCharacter}</th>
                <th className="border border-[#999] px-2 py-1">{copy.tableDate}</th>
                <th className="border border-[#999] px-2 py-1">{copy.tableOk}</th>
                <th className="border border-[#999] px-2 py-1">{copy.tableNok}</th>
                <th className="border border-[#999] px-2 py-1">{copy.tableNotes}</th>
              </tr>
            </thead>
            <tbody>
              {SAFETY_CHARACTER_IDS.map((id) => (
                <tr key={id}>
                  <td className="border border-[#999] px-2 py-2 font-semibold">
                    {SAFETY_CHARACTER_LABELS_NL[id]}
                  </td>
                  <td className="border border-[#999] px-2 py-2">________</td>
                  <td className="border border-[#999] px-2 py-2">____</td>
                  <td className="border border-[#999] px-2 py-2">____</td>
                  <td className="border border-[#999] px-2 py-2">________________</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {CATEGORY_ORDER.map((category) => {
          const rows = casesByCategory(category).filter((r) => r.id !== "confusion-03");
          return (
            <section key={category} className="mb-5 break-inside-avoid-page">
              <h2 className="mb-2 border-b border-[#aaa] pb-1 text-base font-bold">
                {SAFETY_CATEGORY_LABELS_NL[category]}
              </h2>
              <table className="w-full border-collapse text-[11px] leading-tight">
                <thead>
                  <tr className="bg-[#f5f5f5]">
                    <th className="border border-[#999] px-1 py-1 text-left w-[4%]">#</th>
                    <th className="border border-[#999] px-1 py-1 text-left w-[28%]">
                      {copy.colYouSay}
                    </th>
                    <th className="border border-[#999] px-1 py-1 text-left w-[22%]">
                      {copy.colExpected}
                    </th>
                    {SAFETY_CHARACTER_IDS.map((id) => (
                      <th
                        key={id}
                        className="border border-[#999] px-0.5 py-1 text-center w-[11%]"
                      >
                        {SAFETY_CHARACTER_LABELS_NL[id]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-[#999] px-1 py-1 align-top">{row.id}</td>
                      <td className="border border-[#999] px-1 py-1 align-top font-medium">
                        {row.userNl}
                      </td>
                      <td className="border border-[#999] px-1 py-1 align-top text-[10px]">
                        {row.expect.join(" · ")}
                      </td>
                      <CheckCells />
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}

        <section className="mb-5 break-inside-avoid-page">
          <h2 className="mb-2 border-b border-[#aaa] pb-1 text-base font-bold">
            {copy.identityHeading}
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#f5f5f5]">
                <th className="border border-[#999] px-1 py-1 text-left">{copy.tableCharacter}</th>
                <th className="border border-[#999] px-1 py-1 text-left">{copy.colYouSay}</th>
                <th className="border border-[#999] px-1 py-1 text-left">{copy.colExpected}</th>
                <th className="border border-[#999] px-1 py-1">{copy.tableOk} / {copy.tableNok}</th>
              </tr>
            </thead>
            <tbody>
              {SAFETY_CHARACTER_IDS.map((id) => (
                <tr key={id}>
                  <td className="border border-[#999] px-1 py-1 font-semibold">
                    {SAFETY_CHARACTER_LABELS_NL[id]}
                  </td>
                  <td className="border border-[#999] px-1 py-1">{SAFETY_IDENTITY_LINE_NL[id]}</td>
                  <td className="border border-[#999] px-1 py-1 text-[10px]">
                    {SAFETY_TEST_MATRIX_NL.find((r) => r.id === "confusion-03")?.expect.join(" · ")}
                  </td>
                  <td className="border border-[#999] px-1 py-1 text-center">☐ OK ☐ NOK</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-4 break-inside-avoid-page">
          <h2 className="mb-2 font-bold">{copy.voiceHeading}</h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#f5f5f5]">
                <th className="border border-[#999] px-2 py-1 text-left">#</th>
                <th className="border border-[#999] px-2 py-1 text-left">{copy.colCheck}</th>
                {SAFETY_CHARACTER_IDS.map((id) => (
                  <th key={id} className="border border-[#999] px-1 py-1">
                    {SAFETY_CHARACTER_LABELS_NL[id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {copy.voiceRows.map((row, i) => (
                <tr key={row}>
                  <td className="border border-[#999] px-2 py-1">F{i + 1}</td>
                  <td className="border border-[#999] px-2 py-1">{row}</td>
                  {SAFETY_CHARACTER_IDS.map((id) => (
                    <td key={id} className="border border-[#999] px-1 py-1 text-center">
                      {i === 1 && (id === "peter" || id === "maarten")
                        ? "—"
                        : "☐ OK ☐ NOK"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 font-bold">{copy.quickHeading}</h2>
          <ol className="list-decimal pl-5 text-sm">
            {copy.quickSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-2 font-bold">{copy.finalHeading}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#f0f0f0]">
                <th className="border border-[#999] px-2 py-1 text-left">{copy.tableCharacter}</th>
                <th className="border border-[#999] px-2 py-1">{copy.finalSafe}</th>
                <th className="border border-[#999] px-2 py-1">{copy.finalAction}</th>
              </tr>
            </thead>
            <tbody>
              {SAFETY_CHARACTER_IDS.map((id) => (
                <tr key={id}>
                  <td className="border border-[#999] px-2 py-2 font-semibold">
                    {SAFETY_CHARACTER_LABELS_NL[id]}
                  </td>
                  <td className="border border-[#999] px-2 py-2 text-center">☐ {copy.yes} ☐ {copy.no}</td>
                  <td className="border border-[#999] px-2 py-2">________________</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm">
            {copy.signature}: _______________________
          </p>
        </section>
      </article>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .safety-print-root,
          .safety-print-root * {
            visibility: visible;
          }
          .safety-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            border: none !important;
            border-radius: 0 !important;
            padding: 8mm !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
