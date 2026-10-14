import type { ClothingItem } from "@dripcast/api";

/** Outfit slots filled by the Today's Fit assembler. */
export type OutfitSlot = "tops" | "bottoms" | "shoes" | "outerwear";

export const SLOT_LABELS: Record<OutfitSlot, string> = {
  tops: "Top",
  bottoms: "Bottoms",
  shoes: "Shoes",
  outerwear: "Outerwear",
};

const SLOT_KEYWORDS: Record<OutfitSlot, string[]> = {
  outerwear: ["jacket", "coat", "blazer", "parka", "windbreaker", "hoodie", "cardigan", "vest"],
  tops: ["shirt", "tee", "t-shirt", "tshirt", "tank", "blouse", "sweater", "polo", "henley", "top"],
  bottoms: ["pants", "jeans", "shorts", "skirt", "trousers", "joggers", "leggings", "chinos"],
  shoes: ["shoe", "boot", "sneaker", "sandal", "heel", "loafer", "slide", "footwear"],
};

/**
 * Slot check order. Outerwear goes before tops so a "hoodie" lands in
 * outerwear instead of matching nothing in tops; tops go before bottoms so
 * "tank top" style names don't fall through.
 */
const SLOT_ORDER: OutfitSlot[] = ["outerwear", "tops", "bottoms", "shoes"];

/**
 * Heuristic v1 categorization from the item name. The backend item model has
 * no category field, so this is a best-effort keyword match until users can
 * tag items explicitly.
 */
export function categorizeItem(name: string): OutfitSlot | "other" {
  const lower = name.toLowerCase();
  for (const slot of SLOT_ORDER) {
    if (SLOT_KEYWORDS[slot].some((keyword) => lower.includes(keyword))) {
      return slot;
    }
  }
  return "other";
}

/** Case-insensitive keyword hit-test on an item name. */
function matchesKeywords(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

/** Deterministic pseudo-random generator so a seed re-rolls the outfit. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface AssembledOutfit {
  slots: Record<OutfitSlot, ClothingItem | null>;
  unassigned: ClothingItem[];
}

/**
 * Weather-condition groups that steer outfit picks. Values arrive as either
 * the raw OpenWeatherMap `weather[0].main` ("Rain", "Thunderstorm", …) or
 * the human labels from `conditionLabel` ("Storms", …) — both are handled.
 */
type ConditionGroup = "wet" | "snow";

function conditionGroup(condition: string | undefined): ConditionGroup | null {
  const c = (condition ?? "").trim().toLowerCase();
  if (c === "rain" || c === "drizzle" || c === "thunderstorm" || c === "storms") {
    return "wet";
  }
  if (c === "snow") {
    return "snow";
  }
  return null;
}

/**
 * Per-slot keyword preferences for each condition group. At pick time,
 * candidates matching these win over the plain most-liked pick; when
 * nothing matches, the plain pick is used as fallback — a slot is never
 * left empty because of condition.
 */
const CONDITION_PREFERENCES: Record<
  ConditionGroup,
  Partial<Record<OutfitSlot, string[]>>
> = {
  wet: {
    outerwear: ["jacket", "coat", "windbreaker", "rain", "hooded"],
    shoes: ["boot", "sneaker", "shoe"],
  },
  snow: {
    outerwear: ["coat", "parka", "puffer", "down"],
    shoes: ["boot"],
  },
};

/**
 * Short label for the UI chip shown when condition preferences steer the
 * outfit. Null when the condition carries no preference (clear, cloudy…).
 */
export function conditionNote(condition: string | undefined): string | null {
  switch (conditionGroup(condition)) {
    case "wet":
      return "Rain-ready picks";
    case "snow":
      return "Snow-day picks";
    default:
      return null;
  }
}

/**
 * Assemble one outfit from the given items: per slot pick the most-liked
 * item, breaking ties with a seeded random choice. When `condition` maps to
 * a preference group (wet/snow), candidates matching the group's keywords
 * win per slot first, falling back to the plain pick when nothing matches.
 * Empty slots are backfilled from uncategorized ("other") items, also
 * seeded. Items already chosen are never reused; leftovers come back in
 * `unassigned`.
 */
export function assembleOutfit(
  items: ClothingItem[],
  seed: number,
  condition?: string,
): AssembledOutfit {
  const rand = mulberry32(seed);
  const group = conditionGroup(condition);

  const bySlot: Record<OutfitSlot, ClothingItem[]> = {
    tops: [],
    bottoms: [],
    shoes: [],
    outerwear: [],
  };
  const others: ClothingItem[] = [];

  for (const item of items) {
    const slot = categorizeItem(item.name);
    if (slot === "other") {
      others.push(item);
    } else {
      bySlot[slot].push(item);
    }
  }

  const pickMostLiked = (
    pool: ClothingItem[],
    prefer: string[] | null,
  ): ClothingItem | null => {
    if (pool.length === 0) return null;
    const preferred =
      prefer != null
        ? pool.filter((item) => matchesKeywords(item.name, prefer))
        : [];
    const candidates = preferred.length > 0 ? preferred : pool;
    const maxLikes = Math.max(...candidates.map((item) => item.likes.length));
    const leaders = candidates.filter((item) => item.likes.length === maxLikes);
    return leaders[Math.floor(rand() * leaders.length)];
  };

  const preferForSlot = (slot: OutfitSlot): string[] | null =>
    group ? (CONDITION_PREFERENCES[group][slot] ?? null) : null;

  const slots: Record<OutfitSlot, ClothingItem | null> = {
    tops: null,
    bottoms: null,
    shoes: null,
    outerwear: null,
  };
  const usedIds = new Set<string>();

  for (const slot of SLOT_ORDER) {
    const chosen = pickMostLiked(bySlot[slot], preferForSlot(slot));
    if (chosen) {
      slots[slot] = chosen;
      usedIds.add(chosen._id);
    }
  }

  // NOTE (planned follow-up): backfilling from "other" is a v1 stopgap. The
  // right fix is a `category` field on the backend clothing-item model so
  // users tag items explicitly at add time; then this pool disappears.
  const spareOthers = others.filter((item) => !usedIds.has(item._id));
  for (const slot of SLOT_ORDER) {
    if (slots[slot] === null && spareOthers.length > 0) {
      const prefer = preferForSlot(slot);
      const preferred =
        prefer != null
          ? spareOthers.filter((item) => matchesKeywords(item.name, prefer))
          : [];
      const pool = preferred.length > 0 ? preferred : spareOthers;
      const chosen = pool[Math.floor(rand() * pool.length)];
      slots[slot] = chosen;
      spareOthers.splice(
        spareOthers.findIndex((item) => item._id === chosen._id),
        1,
      );
      usedIds.add(chosen._id);
    }
  }

  return {
    slots,
    unassigned: items.filter((item) => !usedIds.has(item._id)),
  };
}
