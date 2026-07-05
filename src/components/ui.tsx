"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Grote, toegankelijke knop voor oudere gebruikers. */
export function PrimaryButton({
  label,
  onClick,
  disabled,
  type = "button",
  variant = "solid",
  className = "",
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "solid" | "outline";
  className?: string;
}) {
  const base =
    "w-full rounded-2xl px-6 py-4 text-xl font-semibold shadow-sm transition focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "solid"
      ? "bg-gradient-to-br from-[#4a6741] to-[#3d7a6e] text-white shadow-lg shadow-[#4a6741]/25 hover:from-[#3d5636] hover:to-[#356b60] focus:ring-[#4a6741]/40"
      : "border-2 border-[#c9a96e] bg-transparent text-[#5c4a32] hover:bg-[#f5f0e8] focus:ring-[#c9a96e]/40";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
    >
      {label}
    </button>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-lg font-medium text-[#2c2416]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border-2 border-[#d8ccb8] bg-white px-4 py-3 text-lg text-[#2c2416] focus:border-[#4a6741] focus:outline-none focus:ring-2 focus:ring-[#4a6741]/30"
      />
    </label>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#e8dfd0]/80 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      aria-live="polite"
      className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-lg text-red-800"
    >
      {message}
    </p>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-lg font-medium text-[#4a6741] underline underline-offset-2 hover:text-[#3d5636]"
    >
      {children}
    </Link>
  );
}

/** Toegankelijke keuze-rij met groot aanraakvlak. */
export function CheckRow({
  title,
  description,
  checked,
  onToggle,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-start gap-4 rounded-2xl border-2 border-[#d8ccb8] bg-white p-4 text-left transition hover:border-[#4a6741] focus:outline-none focus:ring-2 focus:ring-[#4a6741]/30"
    >
      <span
        aria-hidden="true"
        className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border-2 ${
          checked
            ? "border-[#4a6741] bg-[#4a6741] text-white"
            : "border-[#b8a888] bg-white"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      <span>
        <span className="block text-lg font-medium text-[#2c2416]">
          {title}
        </span>
        {description ? (
          <span className="mt-1 block text-base text-[#5c4a32]">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** Achtergrond — ocean view (definitief). */
export function CalmBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 bg-[#1a4a6e]">
      <img
        src="/ocean-bg.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/35" />
    </div>
  );
}
