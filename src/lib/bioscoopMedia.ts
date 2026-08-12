export type BioscoopCategoryId =
  | "nature"
  | "landscapes"
  | "beaches"
  | "forests"
  | "mountains"
  | "villages"
  | "animals"
  | "gardens";

/** Temporary example images per destination — later replaced by live feed. */
export const BIOSCOOP_CATEGORY_IMAGES: Record<BioscoopCategoryId, string> = {
  nature: "/bioscoop/relaxing-music-therapy.png",
  landscapes: "/bioscoop/deep-sea-ocean-creatures.png",
  beaches: "/bioscoop/wonders-caribbean.png",
  forests: "/bioscoop/amazon-jungle-birds.png",
  mountains: "/bioscoop/wonders-planet-earth.png",
  villages: "/bioscoop/rustige-dorpjes.png",
  animals: "/bioscoop/wildlife-documentary.png",
  gardens: "/bioscoop/bloeiende-tuinen.png",
};

/** Optional in-window video (YouTube embed). */
export const BIOSCOOP_CATEGORY_EMBED: Partial<
  Record<BioscoopCategoryId, string>
> = {
  animals:
    "https://www.youtube.com/embed/osdVLIXs820?list=PL3pQKPQdkP_M5rGBNTxpKR42RlMI5XR0r&rel=0&modestbranding=1",
  mountains:
    "https://www.youtube.com/embed/hwXoiqThXks?rel=0&modestbranding=1",
  beaches: "https://www.youtube.com/embed/6D9WECs9F_I?rel=0&modestbranding=1",
  nature: "https://www.youtube.com/embed/BHACKCNDMW8?rel=0&modestbranding=1",
  forests: "https://www.youtube.com/embed/ocBKjNU-Kas?rel=0&modestbranding=1",
  landscapes:
    "https://www.youtube.com/embed/lBWZ9ls9-Oc?list=RDlBWZ9ls9-Oc&rel=0&modestbranding=1",
  villages:
    "https://www.youtube.com/embed/glTaGSaRBR4?rel=0&modestbranding=1",
  gardens:
    "https://www.youtube.com/embed/Rs3-OJBYKSY?rel=0&modestbranding=1",
};

export const BIOSCOOP_CATEGORY_IDS: readonly BioscoopCategoryId[] = [
  "nature",
  "landscapes",
  "beaches",
  "forests",
  "mountains",
  "villages",
  "animals",
  "gardens",
] as const;

export function getBioscoopImage(id: BioscoopCategoryId): string {
  return BIOSCOOP_CATEGORY_IMAGES[id];
}

/** YouTube embed with player UI language matching the app language. */
export function getBioscoopEmbed(
  id: BioscoopCategoryId,
  lang: string = "nl"
): string | null {
  const base = BIOSCOOP_CATEGORY_EMBED[id];
  if (!base) return null;
  const hl = encodeURIComponent(lang.slice(0, 2).toLowerCase());
  return `${base}&hl=${hl}&cc_lang_pref=${hl}`;
}

/** Embed URL for a live-searched video (not one of the 8 pinned categories). */
export function getBioscoopSearchEmbed(
  videoId: string,
  lang: string = "nl"
): string {
  const hl = encodeURIComponent(lang.slice(0, 2).toLowerCase());
  return `https://www.youtube.com/embed/${encodeURIComponent(
    videoId
  )}?rel=0&modestbranding=1&hl=${hl}&cc_lang_pref=${hl}`;
}

/** Extra pinned workout slots (not part of the 8 categories). */
export type BioscoopFeatureSlotId =
  | "stoelWorkout"
  | "fitnessOefeningen"
  | "seniorDanceFitness"
  | "taichiWorkout";

export const BIOSCOOP_FEATURE_SLOTS: readonly {
  id: BioscoopFeatureSlotId;
  videoId: string;
  /** Optional playlist — omit for a single video. */
  listId?: string;
  image: string;
}[] = [
  {
    id: "stoelWorkout",
    videoId: "aZMdDrOlTCU",
    listId: "PLm55iprghi2DxUPvvGxe5ICz3h9BNSoUm",
    image: "https://i.ytimg.com/vi/aZMdDrOlTCU/hqdefault.jpg",
  },
  {
    id: "fitnessOefeningen",
    videoId: "75qDaEWovrs",
    listId: "PLo-Jgh317yZqBLe8wQQTxfTQoVVd0gonr",
    image: "https://i.ytimg.com/vi/75qDaEWovrs/hqdefault.jpg",
  },
  {
    id: "seniorDanceFitness",
    videoId: "IdcKe52onKU",
    image: "https://i.ytimg.com/vi/IdcKe52onKU/hqdefault.jpg",
  },
  {
    id: "taichiWorkout",
    videoId: "mHJjYJncpqM",
    image: "https://i.ytimg.com/vi/mHJjYJncpqM/hqdefault.jpg",
  },
] as const;

export function getBioscoopFeatureEmbed(
  slot: (typeof BIOSCOOP_FEATURE_SLOTS)[number],
  lang: string = "nl"
): string {
  const hl = encodeURIComponent(lang.slice(0, 2).toLowerCase());
  const list = slot.listId
    ? `&list=${encodeURIComponent(slot.listId)}`
    : "";
  return `https://www.youtube.com/embed/${encodeURIComponent(
    slot.videoId
  )}?rel=0&modestbranding=1${list}&hl=${hl}&cc_lang_pref=${hl}`;
}
