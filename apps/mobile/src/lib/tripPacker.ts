/**
 * Trip packer (roadmap feature #5): destination + dates in, day-by-day
 * packing list out. Geocodes the city via OpenWeatherMap, pulls the 5-day
 * forecast for the destination, then assembles one outfit per trip day from
 * the closet — clean pieces first, no repeats until the closet runs dry.
 *
 * Pure logic + thin fetchers; the screen lives in app/(tabs)/trips.tsx.
 */
import type { ClothingItem, WeatherBucket } from "@dripcast/api";
import { assembleOutfit, categorizeItem, type AssembledOutfit, type OutfitSlot } from "./outfit";
import { bucketForTempF } from "./weather";
import type { ForecastEntry } from "./eveningAlert";
import type { Persona } from "./personas";

export interface TripDayForecast {
  /** YYYY-MM-DD in the destination's local time. */
  date: string;
  highF: number;
  lowF: number;
  bucket: WeatherBucket;
  rain: boolean;
  /** True when the date falls past the 5-day forecast window. */
  estimated: boolean;
}

export interface TripDayPack {
  date: string;
  forecast: TripDayForecast;
  outfit: AssembledOutfit;
}

export interface PackingList {
  destination: string;
  startDate: string;
  endDate: string;
  days: TripDayPack[];
  essentials: string[];
}

export interface GeoResult {
  lat: number;
  lon: number;
  displayName: string;
}

const WET = new Set(["rain", "drizzle", "thunderstorm", "snow"]);

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** YYYY-MM-DD in UTC (trips are date-based, not time-based). */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Strict YYYY-MM-DD parse; null when malformed or impossible. */
export function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  ) {
    return null;
  }
  return d;
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  if (!d) return key;
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** Inclusive list of YYYY-MM-DD keys from start to end. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  for (let i = 0; i < 60 && cur <= end; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Deterministic seed from a string so a trip's list is stable. */
function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** City name -> coordinates via OpenWeatherMap geocoding (free tier). */
export async function geocodeCity(city: string, apiKey: string): Promise<GeoResult> {
  const res = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`,
  );
  if (!res.ok) throw new Error(`Couldn't look up "${city}" (${res.status}).`);
  const json = (await res.json()) as Array<{
    lat: number;
    lon: number;
    name: string;
    state?: string;
    country?: string;
  }>;
  const first = json[0];
  if (!first) throw new Error(`Couldn't find "${city}" — check the spelling.`);
  return {
    lat: first.lat,
    lon: first.lon,
    displayName: [first.name, first.state, first.country].filter(Boolean).join(", "),
  };
}

interface TripForecastApiEntry {
  dt: number;
  main: { temp: number };
  weather: Array<{ main: string }>;
}

/** 5-day / 3-hour forecast for arbitrary coordinates + the city's tz offset. */
export async function fetchTripForecast(
  lat: number,
  lon: number,
  apiKey: string,
): Promise<{ entries: ForecastEntry[]; tzOffset: number }> {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
  );
  if (!res.ok) throw new Error(`Forecast request failed (${res.status}).`);
  const json = (await res.json()) as {
    list?: TripForecastApiEntry[];
    city?: { timezone?: number };
  };
  return {
    entries: (json.list ?? []).map((e) => ({
      dt: e.dt,
      tempF: Math.round(e.main.temp),
      condition: e.weather[0]?.main ?? "Clear",
    })),
    tzOffset: json.city?.timezone ?? 0,
  };
}

/**
 * Collapse 3-hour forecast entries into one summary per trip day, using the
 * destination's local dates. Days past the forecast window are estimated
 * from the forecasted days' average.
 */
export function buildDayForecasts(
  entries: ForecastEntry[],
  tzOffset: number,
  startDate: string,
  endDate: string,
): TripDayForecast[] {
  const byDate = new Map<string, ForecastEntry[]>();
  for (const e of entries) {
    const local = new Date((e.dt + tzOffset) * 1000);
    const key = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
    const list = byDate.get(key);
    if (list) list.push(e);
    else byDate.set(key, [e]);
  }
  const forecasted = [...byDate.values()].filter((l) => l.length > 0);
  const avgHigh =
    forecasted.length > 0
      ? Math.round(
          forecasted.reduce((s, l) => s + Math.max(...l.map((e) => e.tempF)), 0) /
            forecasted.length,
        )
      : 72;
  const avgLow =
    forecasted.length > 0
      ? Math.round(
          forecasted.reduce((s, l) => s + Math.min(...l.map((e) => e.tempF)), 0) /
            forecasted.length,
        )
      : 58;

  return daysBetween(startDate, endDate).map((date) => {
    const list = byDate.get(date);
    if (!list || list.length === 0) {
      return {
        date,
        highF: avgHigh,
        lowF: avgLow,
        bucket: bucketForTempF(Math.round((avgHigh + avgLow) / 2)),
        rain: false,
        estimated: true,
      };
    }
    const highF = Math.max(...list.map((e) => e.tempF));
    const lowF = Math.min(...list.map((e) => e.tempF));
    return {
      date,
      highF,
      lowF,
      bucket: bucketForTempF(Math.round((highF + lowF) / 2)),
      rain: list.some((e) => WET.has(e.condition.toLowerCase())),
      estimated: false,
    };
  });
}

function buildEssentials(dayForecasts: TripDayForecast[]): string[] {
  const essentials: string[] = [];
  const n = dayForecasts.length;
  essentials.push(`Socks & underwear — ${n + 1} sets`);
  if (dayForecasts.some((d) => d.rain)) essentials.push("Umbrella or rain shell");
  if (dayForecasts.some((d) => d.bucket === "cold"))
    essentials.push("Warm coat / heavy layer");
  if (dayForecasts.some((d) => d.bucket === "hot")) essentials.push("Sunscreen & sunglasses");
  if (n >= 5) essentials.push("Laundry bag for worn clothes");
  essentials.push("Phone charger");
  essentials.push("Toiletries");
  return essentials;
}

/**
 * One outfit per trip day. Prefers pieces tagged for the day's weather
 * bucket and clean pieces; avoids repeating an item until the closet runs
 * dry (then repeats are allowed — trips are long).
 */
export function buildPackingList(args: {
  items: ClothingItem[];
  dayForecasts: TripDayForecast[];
  destination: string;
  startDate: string;
  endDate: string;
  dirtyIds: Set<string>;
  persona: Persona | null | undefined;
}): PackingList {
  const { items, dayForecasts, dirtyIds, persona, destination, startDate, endDate } = args;
  const clean = items.filter((i) => !dirtyIds.has(i._id));
  const freshPool = clean.length >= 4 ? clean : items;
  const used = new Set<string>();
  const pickSlots: OutfitSlot[] = ["tops", "bottoms", "shoes", "outerwear"];

  const days: TripDayPack[] = dayForecasts.map((fc) => {
    const bucketPool = freshPool.filter((i) => i.weather?.toLowerCase() === fc.bucket);
    const pool = bucketPool.length >= 3 ? bucketPool : freshPool;
    // Per slot, prefer pieces not already packed; a slot falls back to
    // repeats only when every piece in it is already used.
    const pickPool = pickSlots.flatMap((slot) => {
      const inSlot = pool.filter((i) => categorizeItem(i.name) === slot);
      const unused = inSlot.filter((i) => !used.has(i._id));
      return unused.length > 0 ? unused : inSlot;
    });
    const outfit = assembleOutfit(
      pickPool.length > 0 ? pickPool : pool,
      seedFromString(`${destination}|${fc.date}`),
      fc.rain ? "Rain" : undefined,
      persona?.keywords ?? null,
    );
    for (const item of Object.values(outfit.slots)) {
      if (item) used.add(item._id);
    }
    return { date: fc.date, forecast: fc, outfit };
  });

  return {
    destination,
    startDate,
    endDate,
    days,
    essentials: buildEssentials(dayForecasts),
  };
}

/** Validate the trip form; returns an error string or null when valid. */
export function validateTripInput(
  destination: string,
  startDate: string,
  endDate: string,
  todayKey: string,
): string | null {
  if (!destination.trim()) return "Enter a destination.";
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  if (!start || !end) return "Use YYYY-MM-DD dates, e.g. 2026-11-20.";
  if (startDate < todayKey) return "Start date can't be in the past.";
  if (endDate < startDate) return "End date can't be before the start date.";
  const n = daysBetween(startDate, endDate).length;
  if (n > 14) return "Trips are capped at 14 days.";
  return null;
}
