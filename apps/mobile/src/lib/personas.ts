import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OutfitSlot } from "./outfit";

/** Style personas that steer Today's Fit picks toward a vibe. */
export type PersonaId =
  | "streetwear"
  | "clean-girl"
  | "old-money"
  | "gorpcore"
  | "y2k"
  | "vintage"
  | "alt";

export interface Persona {
  id: PersonaId;
  label: string;
  emoji: string;
  blurb: string;
  /** Per-slot keywords, matched as lowercase substrings against item names. */
  keywords: Partial<Record<OutfitSlot, string[]>>;
}

export const PERSONAS: Persona[] = [
  {
    id: "streetwear",
    label: "Streetwear",
    emoji: "🏙️",
    blurb: "Bold, baggy, statement pieces",
    keywords: {
      tops: ["graphic", "hoodie", "oversized", "vintage", "boxy"],
      bottoms: ["cargo", "baggy", "denim", "jogger", "wide-leg"],
      shoes: ["sneaker", "dunk", "jordan", "chunky", "high-top"],
      outerwear: ["puffer", "varsity", "bomber", "windbreaker"],
    },
  },
  {
    id: "clean-girl",
    label: "Clean Girl",
    emoji: "🧴",
    blurb: "Minimal, fresh, effortless",
    keywords: {
      tops: ["ribbed", "tank", "white", "cropped", "seamless", "minimal"],
      bottoms: ["legging", "yoga", "mini", "white", "low-rise"],
      shoes: ["ballet", "flat", "loafer", "sandal", "white"],
      outerwear: ["cardigan", "shawl", "light"],
    },
  },
  {
    id: "old-money",
    label: "Old Money",
    emoji: "🕰️",
    blurb: "Quiet luxury, tailored classics",
    keywords: {
      tops: ["polo", "oxford", "linen", "knit", "button-down", "cashmere"],
      bottoms: ["chino", "pleated", "tailored", "trouser", "bermuda"],
      shoes: ["loafer", "boat", "oxford", "espadrille"],
      outerwear: ["blazer", "trench", "quilted", "cardigan"],
    },
  },
  {
    id: "gorpcore",
    label: "Gorpcore",
    emoji: "🏔️",
    blurb: "Trail-ready utility",
    keywords: {
      tops: ["fleece", "flannel", "thermal", "henley"],
      bottoms: ["cargo", "hiking", "ripstop", "trail"],
      shoes: ["hiking", "trail", "salomon", "boot"],
      outerwear: ["puffer", "shell", "windbreaker", "fleece"],
    },
  },
  {
    id: "y2k",
    label: "Y2K",
    emoji: "🦋",
    blurb: "Throwback maximalism",
    keywords: {
      tops: ["baby tee", "halter", "velour", "mesh", "cropped"],
      bottoms: ["low-rise", "mini", "capri", "baggy", "parachute"],
      shoes: ["platform", "chunky", "mary jane"],
      outerwear: ["cropped", "faux fur", "track"],
    },
  },
  {
    id: "vintage",
    label: "Vintage",
    emoji: "📻",
    blurb: "Thrifted, retro, timeless",
    keywords: {
      tops: ["vintage", "retro", "thrifted", "flannel", "corduroy"],
      bottoms: ["mom", "straight", "vintage", "corduroy", "plaid"],
      shoes: ["converse", "vans", "retro", "sneaker", "boot"],
      outerwear: ["denim", "leather", "flannel", "trench", "corduroy"],
    },
  },
  {
    id: "alt",
    label: "Alt",
    emoji: "🌑",
    blurb: "Dark, alternative, unapologetic",
    keywords: {
      tops: ["black", "mesh", "graphic", "oversized", "distressed"],
      bottoms: ["black", "cargo", "ripped", "leather", "plaid"],
      shoes: ["platform", "boot", "chunky", "combat"],
      outerwear: ["leather", "oversized", "distressed", "plaid"],
    },
  },
];

const PERSONA_KEY = "dripcast.persona";

/** Stored persona id, or null when unset/invalid. Never throws. */
export async function getPersonaId(): Promise<PersonaId | null> {
  try {
    const raw = await AsyncStorage.getItem(PERSONA_KEY);
    if (raw && PERSONAS.some((p) => p.id === raw)) {
      return raw as PersonaId;
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist the persona id; null clears it. Never throws. */
export async function setPersonaId(id: PersonaId | null): Promise<void> {
  try {
    if (id === null) {
      await AsyncStorage.removeItem(PERSONA_KEY);
    } else {
      await AsyncStorage.setItem(PERSONA_KEY, id);
    }
  } catch {
    // Storage failure shouldn't break the vibe picker; it just won't persist.
  }
}

export function getPersona(id: PersonaId | null): Persona | undefined {
  return id ? PERSONAS.find((p) => p.id === id) : undefined;
}
