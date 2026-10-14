import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import type { WeatherBucket } from "@dripcast/api";
import { queryKeys } from "../lib/queryKeys";
import { FALLBACK_LOCATION, bucketForTempF } from "../lib/weather";

export interface WeatherState {
  tempF: number;
  tempC: number;
  condition: string;
  description: string;
  city: string;
  isDay: boolean;
  bucket: WeatherBucket;
  usedFallbackLocation: boolean;
}

interface OpenWeatherResponse {
  main: { temp: number };
  weather: Array<{ main: string; description: string; icon: string }>;
  name: string;
}

async function fetchWeather(): Promise<WeatherState> {
  const apiKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_WEATHER_API_KEY — add it to apps/mobile/.env");
  }

  let coords = FALLBACK_LOCATION;
  let usedFallbackLocation = true;
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      usedFallbackLocation = false;
    } catch {
      // GPS failed — keep the fallback so the screen still renders.
    }
  }

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${apiKey}&units=imperial`,
  );
  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`);
  }
  const json = (await response.json()) as OpenWeatherResponse;
  const tempF = Math.round(json.main.temp);
  const primary = json.weather[0];
  return {
    tempF,
    tempC: Math.round(((tempF - 32) * 5) / 9),
    condition: primary?.main ?? "Clear",
    description: primary?.description ?? "",
    city: json.name || "Nearby",
    isDay: (primary?.icon ?? "d").includes("d"),
    bucket: bucketForTempF(tempF),
    usedFallbackLocation,
  };
}

export function useWeather() {
  return useQuery({
    queryKey: queryKeys.weather,
    queryFn: fetchWeather,
    staleTime: 10 * 60_000,
    retry: 1,
  });
}
