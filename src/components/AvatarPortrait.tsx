import { getAvatarPortraitCrop, getAvatarPortraitUrl } from "@/lib/avatars";
import type { VoiceIdentityId } from "@/lib/voice/types";

const SIZE_CLASS = {
  sm: "h-10 w-10 text-[1.05rem] sm:h-11 sm:w-11 sm:text-lg",
  md: "h-[4.5rem] w-[4.5rem] text-4xl sm:h-20 sm:w-20 sm:text-5xl",
  lg: "h-28 w-28 sm:h-32 sm:w-32",
  xl: "h-44 w-44 sm:h-52 sm:w-52",
} as const;

const PIXEL_SIZE = {
  sm: 48,
  md: 96,
  lg: 128,
  xl: 208,
} as const;

type AvatarPortraitProps = {
  identityId: VoiceIdentityId;
  displayName: string;
  size?: keyof typeof SIZE_CLASS;
  /** Vult de oudercontainer (bijv. stemknop). */
  fill?: boolean;
  className?: string;
};

export function AvatarPortrait({
  identityId,
  displayName,
  size = "sm",
  fill = false,
  className = "",
}: AvatarPortraitProps) {
  const src = getAvatarPortraitUrl(identityId);
  const crop = getAvatarPortraitCrop(identityId);
  const initial = displayName.charAt(0);
  const sizeClass = fill ? "h-full w-full" : SIZE_CLASS[size];

  if (!src) {
    return (
      <span
        className={`flex items-center justify-center rounded-full border-2 border-white bg-white font-extrabold text-[#4a6741] ${sizeClass} ${className}`}
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }

  const px = fill ? 64 : PIXEL_SIZE[size];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={px}
      height={px}
      className={`rounded-full border-2 border-white object-cover ${crop?.scale ?? ""} ${crop?.position ?? "object-[center_18%]"} ${sizeClass} ${className}`}
    />
  );
}
