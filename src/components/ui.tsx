"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  hartmaatjeGreenButtonClass,
  hartmaatjeGreenOverlayClass,
  hartmaatjeGreenSurfaceClass,
  hartmaatjePortraitRingClass,
} from "@/lib/hartmaatjeTheme";

/** Zelfde afmetingen voor groene vlakken op de homepagina. */
export const lightGreenBadgeHomeClass =
  "inline-block min-w-[14rem] px-7 py-3.5 text-xl sm:min-w-[16rem] sm:text-2xl";

/** Video/portret-achtergrond — zelfde donkergroen als Start gesprek. */
export const companionMediaBackdropClass = hartmaatjeGreenSurfaceClass;

export const companionShellClass = hartmaatjeGreenSurfaceClass;

export const companionStartButtonClass = hartmaatjeGreenButtonClass;

export { hartmaatjeGreenButtonClass, hartmaatjeGreenSurfaceClass, hartmaatjePortraitRingClass };

/** Donkergroen vlak — zelfde effect als Start gesprek-knop. */
export const lightGreenDoubleBorderClass = `${hartmaatjeGreenSurfaceClass} font-bold text-white`;

type LightGreenBadgeProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

/** Zelfde donkergroen als alle knoppen — geen lichtgroen meer. */
export function LightGreenBadge({
  children,
  className = "",
  onClick,
  disabled = false,
}: LightGreenBadgeProps) {
  const shared = `${lightGreenDoubleBorderClass} rounded-2xl ${lightGreenBadgeHomeClass} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          if (!disabled) onClick();
        }}
        aria-disabled={disabled}
        className={`${shared} transition ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:brightness-[1.06] active:scale-[0.98]"
        }`}
      >
        {children}
      </button>
    );
  }

  return <p className={shared}>{children}</p>;
}

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
    "w-full px-6 py-4 text-2xl font-semibold transition focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "solid"
      ? `${hartmaatjeGreenButtonClass} focus:ring-[#4a6741]/40`
      : "rounded-2xl border-2 border-[#c9a96e] bg-transparent text-[#5c4a32] shadow-sm hover:bg-[#f5f0e8] focus:ring-[#c9a96e]/40";
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
      <span className="mb-1 block text-xl font-medium text-[#2c2416]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border-2 border-[#d8ccb8] bg-white px-4 py-3.5 text-xl text-[#2c2416] focus:border-[#4a6741] focus:outline-none focus:ring-2 focus:ring-[#4a6741]/30"
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
      className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-xl text-red-800"
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
            ? `${hartmaatjeGreenSurfaceClass} border-transparent text-white`
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

/** Ronde microfoonknop — zelfde donkergroen. */
export const hartmaatjeMicButtonClass = `border-[#40663d] ${hartmaatjeGreenSurfaceClass}`;

/** Eenvoudig microfoon-icoon voor de ronde praatknop. */
export function MicGlyph({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

export function CalmBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#1B493C] via-[#05381F] to-[#0a2218]"
    />
  );
}
