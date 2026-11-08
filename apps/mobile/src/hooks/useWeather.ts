import { useQuery } from "@tanstack/react-query";
import type { WeatherBucket } from "@dripcast/api";
import { queryKeys } from "../lib/queryKeys";
import { getCoords, bucketForTempF } from "../lib/weather";
import type { ForecastEntry } from "../lib/eveningAlert";

export interface WeatherState {
  tempF: number;
  tempC: number;
  feelsLikeF: number;
  condition: string;
  description: string;
  city: string;
  isDay: boolean;
  bucket: WeatherBucket;
  usedFallbackLocation: boolean;
  /** Device (or fallback) coordinates — shown in the universe telemetry. */
  latitude: number;
  longitude: number;
  humidity: number;
  pressureHpa: number;
  windMph: number;
  /** Miles; undefined when the API omits visibility. */
  visibilityMiles?: number;
}

interface OpenWeatherResponse {
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  wind: { speed: number };
  visibility?: number;
  weather: Array<{ main: string; description: string; icon: string }>;
  name: string;
}

async function fetchWeather(): Promise<WeatherState> {
  const apiKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_WEATHER_API_KEY — add it to apps/mobile/.env");
  }

  const { latitude, longitude, usedFallbackLocation } = await getCoords();

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`,
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
    feelsLikeF: Math.round(json.main.feels_like),
    condition: primary?.main ?? "Clear",
    description: primary?.description ?? "",
    city: json.name || "Nearby",
    isDay: (primary?.icon ?? "d").includes("d"),
    bucket: bucketForTempF(tempF),
    usedFallbackLocation,
    latitude,
    longitude,
    humidity: json.main.humidity,
    pressureHpa: json.main.pressure,
    windMph: Math.round(json.wind.speed * 2.23694),
    visibilityMiles:
      json.visibility !== undefined ? Math.round((json.visibility / 1609.34) * 10) / 10 : undefined,
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

interface ForecastApiEntry {
  dt: number;
  main: { temp: number };
  weather: Array<{ main: string }>;
}

interface ForecastApiResponse {
  list: ForecastApiEntry[];
}

async function fetchForecast(): Promise<ForecastEntry[]> {
  const apiKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_WEATHER_API_KEY — add it to apps/mobile/.env");
  }

  const { latitude, longitude } = await getCoords();

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`,
  );
  if (!response.ok) {
    throw new Error(`Forecast request failed (${response.status})`);
  }
  const json = (await response.json()) as ForecastApiResponse;
  return (json.list ?? []).map((entry) => ({
    dt: entry.dt,
    tempF: Math.round(entry.main.temp),
    condition: entry.weather[0]?.main ?? "Clear",
  }));
}

/** 3-hour-step forecast for the next 5 days — powers the evening-drop alert. */
export function useForecast() {
  return useQuery({
    queryKey: queryKeys.forecast,
    queryFn: fetchForecast,
    staleTime: 30 * 60_000,
    retry: 1,
  });
}
