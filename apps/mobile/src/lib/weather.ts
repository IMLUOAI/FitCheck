import * as Location from "expo-location";
import type { WeatherBucket } from "@dripcast/api";

/** Plano, TX — used when the device denies location or has no GPS. */
export const FALLBACK_LOCATION: { latitude: number; longitude: number } = {
  latitude: 33.0198,
  longitude: -96.6989,
};

export interface Coords {
  latitude: number;
  longitude: number;
  usedFallbackLocation: boolean;
}

/**
 * Device coordinates with graceful fallback: asks for foreground location
 * permission, falls back to Plano, TX when denied or when GPS fails.
 * Safe to call from multiple queries — after the first grant the OS
 * resolves without prompting again.
 */
export async function getCoords(): Promise<Coords> {
  let latitude = FALLBACK_LOCATION.latitude;
  let longitude = FALLBACK_LOCATION.longitude;
  let usedFallbackLocation = true;
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      usedFallbackLocation = false;
    } catch {
      // GPS failed — keep the fallback so the screen still renders.
    }
  }
  return { latitude, longitude, usedFallbackLocation };
}

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
