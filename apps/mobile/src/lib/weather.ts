import type { WeatherBucket } from "@dripcast/api";

/** Plano, TX — used when the device denies location or has no GPS. */
export const FALLBACK_LOCATION: { latitude: number; longitude: number } = {
  latitude: 33.0198,
  longitude: -96.6989,
};

/**
 * Bucket logic shared with the web app:
 * hot >= 80°F, warm 66–80°F, cold < 66°F.
 */
export function bucketForTempF(tempF: number): WeatherBucket {
  if (tempF >= 80) return "hot";
  if (tempF >= 66) return "warm";
  return "cold";
}

/** Short human label for an OpenWeatherMap `main` condition. */
export function conditionLabel(condition: string): string {
  switch (condition.toLowerCase()) {
    case "clear":
      return "Clear skies";
    case "clouds":
      return "Cloudy";
    case "rain":
      return "Rain";
    case "drizzle":
      return "Drizzle";
    case "thunderstorm":
      return "Storms";
    case "snow":
      return "Snow";
    case "mist":
    case "fog":
    case "haze":
      return "Foggy";
    default:
      return condition;
  }
}
