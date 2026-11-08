import type { ImageSourcePropType } from "react-native";
import type { WeatherBucket } from "@dripcast/api";

type DayNight = "day" | "night";

/**
 * Mature (17+) hero art. Server-hosted URLs take precedence when filled in;
 * otherwise the bundled mature set below is used. Under-17 (or unknown age)
 * never sees either — they always get BUNDLED_ART.
 */
const MATURE_ART_URLS: Record<WeatherBucket, Record<DayNight, string>> = {
  hot: { day: "", night: "" },
  warm: { day: "", night: "" },
  cold: { day: "", night: "" },
};

/** Bundled mature (17+) set. */
const MATURE_BUNDLED_ART: Record<WeatherBucket, Record<DayNight, ImageSourcePropType>> = {
  hot: {
    day: require("../../assets/hero/mature/mature-hot-day.jpg"),
    night: require("../../assets/hero/mature/mature-hot-night.jpg"),
  },
  warm: {
    day: require("../../assets/hero/mature/mature-warm-day.jpg"),
    night: require("../../assets/hero/mature/mature-warm-night.jpg"),
  },
  cold: {
    day: require("../../assets/hero/mature/mature-cold-day.jpg"),
    night: require("../../assets/hero/mature/mature-cold-night.jpg"),
  },
};

/** Bundled under-17 set (also the fallback for everything). */
const BUNDLED_ART: Record<WeatherBucket, Record<DayNight, ImageSourcePropType>> = {
  hot: {
    day: require("../../assets/hero/hero-hot.jpg"),
    night: require("../../assets/hero/hero-hot.jpg"),
  },
  warm: {
    day: require("../../assets/hero/hero-warm-young.jpg"),
    night: require("../../assets/hero/hero-warm-young.jpg"),
  },
  cold: {
    day: require("../../assets/hero/hero-cold-young.jpg"),
    night: require("../../assets/hero/hero-cold-young.jpg"),
  },
};

/**
 * Resolve the hero banner image for the birthday-gate.
 * Under-17 (or unknown age) always gets the standard bundled set; 17+ gets
 * the server-hosted mature set when URLs are filled in, else the bundled
 * mature set.
 */
export function getHeroArt(
  bucket: WeatherBucket,
  isDay: boolean,
  isAdult: boolean,
): ImageSourcePropType {
  const time: DayNight = isDay ? "day" : "night";
  if (isAdult) {
    const url = MATURE_ART_URLS[bucket][time];
    if (url) return { uri: url };
    return MATURE_BUNDLED_ART[bucket][time];
  }
  return BUNDLED_ART[bucket][time];
}
