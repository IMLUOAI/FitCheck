import { OILS, type Oil } from "./oils";
import { PERSONAS, type PersonaId } from "./personas";

/**
 * Daily scent pairing: one oil a day for the Daily Combo, picked from the
 * temperature and the style world — the same two signals the outfit itself
 * uses. The pick is seeded by the calendar date, so today's scent stays
 * the same all day and a fresh one arrives tomorrow (shuffle in the combo
 * rolls a different one on demand).
 */

type TempBand = "cold" | "cool" | "mild" | "warm" | "hot";

function tempBand(tempF: number): TempBand {
  if (tempF < 50) return "cold";
  if (tempF < 65) return "cool";
  if (tempF < 75) return "mild";
  if (tempF < 85) return "warm";
  return "hot";
}

const TEMP_PHRASE: Record<TempBand, string> = {
  cold: "Warming for a cold day",
  cool: "Grounding for a cool day",
  mild: "Balanced for a mild day",
  warm: "Fresh for a warm day",
  hot: "Cooling for a hot day",
};

type Candidate = {
  name: string;
  temps: TempBand[];
  styles: PersonaId[];
};

/**
 * Curated pairings, by oil name. Temps are the feel of the oil (warming
 * spices for cold days, cooling mints and citruses for hot ones); styles
 * are the persona each oil's character fits. An empty styles list means
 * the oil pairs on temperature alone.
 */
const CANDIDATES: Candidate[] = [
  // Warming — cold and cool days.
  { name: "Cinnamon Bark", temps: ["cold", "cool"], styles: [] },
  { name: "Clove", temps: ["cold", "cool"], styles: [] },
  { name: "Ginger", temps: ["cold", "cool"], styles: ["gorpcore"] },
  { name: "Cassia", temps: ["cold", "cool"], styles: [] },
  { name: "Black Pepper", temps: ["cold", "cool"], styles: ["streetwear", "alt"] },
  { name: "Wintergreen", temps: ["cold", "cool"], styles: ["gorpcore"] },
  { name: "Marjoram", temps: ["cold", "cool"], styles: ["vintage"] },
  { name: "Frankincense", temps: ["cold", "cool", "mild"], styles: ["old-money", "vintage"] },
  { name: "Cedarwood", temps: ["cold", "cool"], styles: ["old-money", "gorpcore"] },
  { name: "Vetiver", temps: ["cold", "cool", "mild"], styles: ["streetwear", "alt"] },
  { name: "Sandalwood", temps: ["cold", "cool", "mild"], styles: ["old-money"] },
  { name: "Myrrh", temps: ["cold", "cool"], styles: ["old-money", "alt"] },
  { name: "Black Spruce", temps: ["cold", "cool"], styles: ["alt", "gorpcore"] },
  { name: "Siberian Fir", temps: ["cold", "cool"], styles: ["gorpcore"] },
  { name: "Spikenard", temps: ["cold", "cool"], styles: ["alt"] },
  { name: "Patchouli", temps: ["cool", "mild"], styles: ["streetwear", "alt"] },
  { name: "Guaiacwood", temps: ["cool", "mild"], styles: ["alt"] },
  { name: "Cypress", temps: ["cool", "mild"], styles: ["gorpcore", "streetwear"] },
  { name: "Douglas Fir", temps: ["cool", "mild"], styles: ["gorpcore"] },
  { name: "Juniper Berry", temps: ["cool", "mild"], styles: ["gorpcore"] },
  // Cooling and bright — warm and hot days.
  { name: "Peppermint", temps: ["warm", "hot"], styles: ["clean-girl", "gorpcore"] },
  { name: "Spearmint", temps: ["warm", "hot"], styles: ["clean-girl", "y2k"] },
  { name: "Eucalyptus", temps: ["warm", "hot"], styles: ["clean-girl"] },
  { name: "Lemon", temps: ["warm", "hot", "mild"], styles: ["clean-girl", "y2k"] },
  { name: "Grapefruit", temps: ["warm", "hot"], styles: ["clean-girl", "y2k"] },
  { name: "Lime", temps: ["warm", "hot"], styles: ["y2k"] },
  { name: "Green Mandarin", temps: ["warm", "mild"], styles: ["y2k", "clean-girl"] },
  { name: "Tea Tree", temps: ["warm", "mild"], styles: ["clean-girl"] },
  // Balanced, all-rounders.
  { name: "Lavender", temps: ["mild", "warm", "cool"], styles: ["clean-girl", "vintage"] },
  { name: "Wild Orange", temps: ["mild", "warm"], styles: ["y2k", "clean-girl"] },
  { name: "Tangerine", temps: ["mild", "warm"], styles: ["y2k"] },
  { name: "Bergamot", temps: ["mild", "warm"], styles: ["vintage", "clean-girl"] },
  { name: "Geranium", temps: ["mild", "warm"], styles: ["vintage", "old-money"] },
  { name: "Ylang Ylang", temps: ["mild", "warm"], styles: ["y2k", "vintage"] },
  { name: "Roman Chamomile", temps: ["mild", "cool"], styles: ["vintage", "clean-girl"] },
  { name: "Clary Sage", temps: ["mild", "cool"], styles: ["vintage"] },
  { name: "Rose", temps: ["mild", "cool"], styles: ["old-money", "vintage"] },
  { name: "Pink Pepper", temps: ["mild", "warm"], styles: ["y2k", "streetwear"] },
  { name: "Melissa", temps: ["mild", "cool"], styles: ["vintage"] },
  // Blends.
  { name: "Balance", temps: ["cold", "cool"], styles: ["old-money"] },
  { name: "Serenity", temps: ["mild", "cool"], styles: ["clean-girl", "vintage"] },
  { name: "Breathe", temps: ["warm", "hot"], styles: ["clean-girl", "gorpcore"] },
  { name: "On Guard", temps: ["cold", "cool"], styles: ["old-money"] },
  { name: "Citrus Bliss", temps: ["warm", "hot"], styles: ["y2k"] },
  { name: "Deep Blue", temps: ["warm", "hot"], styles: ["gorpcore"] },
  { name: "Peace", temps: ["mild", "cool"], styles: ["vintage", "old-money"] },
  { name: "Motivate", temps: ["mild", "warm"], styles: ["y2k", "streetwear"] },
  { name: "Cheer", temps: ["mild", "warm"], styles: ["y2k"] },
  { name: "Adaptiv", temps: ["cool", "mild"], styles: ["clean-girl"] },
  { name: "Northern Escape", temps: ["cold", "cool"], styles: ["gorpcore"] },
  { name: "Shinrin-Yoku", temps: ["cool", "mild"], styles: ["gorpcore"] },
  { name: "Anchor", temps: ["cold", "cool"], styles: ["old-money"] },
  { name: "Arise", temps: ["warm", "mild"], styles: ["y2k", "streetwear"] },
  { name: "TerraShield", temps: ["warm", "mild"], styles: ["gorpcore"] },
  { name: "Air-X", temps: ["warm", "hot"], styles: ["clean-girl"] },
];

/** Small deterministic pick from a seeded number (date seed or shuffle). */
function seededIndex(seed: number, length: number): number {
  let h = seed >>> 0;
  h = (h * 9301 + 49297) % 233280;
  h = (h * 9301 + 49297) % 233280;
  return h % length;
}

export type TripScent = { oil: Oil; reason: string };

/**
 * Representative temperature for a saved fit's weather bucket, so a past
 * day's scent can be reconstructed (past temperatures aren't stored).
 * Buckets: hot ≥80°F, warm ≥66°F, cold below that.
 */
export function tempForBucket(bucket: string | undefined): number {
  if (bucket === "hot") return 85;
  if (bucket === "cold") return 55;
  return 72;
}

/** Date seed from a YYYY-MM-DD key (20261108), for stable per-day picks. */
export function seedFromDateKey(key: string): number {
  const n = Number(key.replace(/-/g, ""));
  return Number.isFinite(n) ? n : 20261108;
}

export function recommendOil(
  tempF: number,
  personaId: PersonaId | null,
  seed: number,
): TripScent {
  const band = tempBand(tempF);
  const scored = CANDIDATES.map((c) => ({
    candidate: c,
    score:
      (c.temps.includes(band) ? 2 : 0) +
      (personaId && c.styles.includes(personaId) ? 2 : 0),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name));

  const top = scored.filter((s) => s.score === scored[0]?.score);
  const pick = top.length > 0 ? top[seededIndex(seed, top.length)].candidate : null;
  const oil =
    OILS.find((o) => o.name === pick?.name) ??
    OILS.find((o) => o.name === "Lavender") ??
    OILS[0];

  const persona = personaId ? PERSONAS.find((p) => p.id === personaId) : undefined;
  const reason =
    `${TEMP_PHRASE[band]} · ${Math.round(tempF)}°F` +
    (persona ? ` · pairs with ${persona.label}` : "");

  return { oil, reason };
}
