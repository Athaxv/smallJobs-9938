export interface PostCategory {
  id: string;
  label: string;
  emoji: string;
}

export const POST_CATEGORIES = [
  { id: "delivery", label: "Delivery / Ride", emoji: "🛵" },
  { id: "errands", label: "Errands", emoji: "✅" },
  { id: "hangout", label: "Hangout", emoji: "☕" },
  { id: "walking", label: "Walking Companion", emoji: "🚶" },
  { id: "study", label: "Study Help", emoji: "📚" },
  { id: "creative", label: "Creative", emoji: "🎨" },
  { id: "food", label: "Food", emoji: "🍱" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "health", label: "Health / Medicine", emoji: "💊" },
  { id: "repair", label: "Repair", emoji: "🔧" },
  { id: "emergency", label: "Emergency", emoji: "🚨" },
  { id: "chat", label: "Just Chat", emoji: "💬" },
  { id: "other", label: "Other", emoji: "✨" },
] as const satisfies readonly PostCategory[];

export type CategoryId = (typeof POST_CATEGORIES)[number]["id"];

export const CATEGORY_IDS = POST_CATEGORIES.map((c) => c.id) as [
  CategoryId,
  ...CategoryId[],
];

/** Categories shown on Explore map filters (local-physical tasks) */
export const EXPLORE_FILTER_CATEGORIES: PostCategory[] = [
  { id: "all", label: "All", emoji: "🗺️" },
  ...POST_CATEGORIES.filter((c) =>
    ["delivery", "errands", "food", "health", "tech", "repair", "walking", "other"].includes(c.id)
  ),
];

const LEGACY_MAP: Record<string, CategoryId> = {
  grocery: "errands",
  transport: "delivery",
  ride: "delivery",
  medicine: "health",
  tutoring: "study",
  teaching: "study",
  "study help": "study",
  "walk & sport": "walking",
  walk: "walking",
  general: "other",
  nearby: "errands",
  technician: "repair",
  purchase: "errands",
  queue: "errands",
  college: "study",
  pet: "other",
  language: "other",
  "local-info": "other",
  remote: "other",
  fandom: "chat",
  interest: "chat",
};

export function normalizeCategory(raw: string): CategoryId {
  const key = raw.trim().toLowerCase();
  if ((CATEGORY_IDS as readonly string[]).includes(key)) return key as CategoryId;
  return LEGACY_MAP[key] ?? "other";
}

export function categoryEmoji(id: string): string {
  const found = POST_CATEGORIES.find((c) => c.id === id);
  if (found) return found.emoji;
  return POST_CATEGORIES.find((c) => c.id === normalizeCategory(id))?.emoji ?? "📌";
}

export function categoryLabel(id: string): string {
  const found = POST_CATEGORIES.find((c) => c.id === id);
  if (found) return found.label;
  return POST_CATEGORIES.find((c) => c.id === normalizeCategory(id))?.label ?? id;
}
