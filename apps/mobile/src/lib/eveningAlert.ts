/**
 * Evening-drop alerts (roadmap feature #3): smart heads-up about what the
 * sky is doing later today, derived from the OpenWeatherMap 3-hour forecast.
 *
 * Pure logic, no React — safe to unit-test in Node.
 */

export interface ForecastEntry {
  /** Unix seconds, UTC. */
  dt: number;
  tempF: number;
  condition: string;
}

export interface EveningAlert {
  kind: "drop" | "warmup" | "rain";
  headline: string;
  detail: string;
}

/** 0 → "12am", 12 → "12pm", 13 → "1pm", … */
function formatHour(hour24: number): string {
  if (hour24 === 0) return "12am";
  if (hour24 < 12) return `${hour24}am`;
  if (hour24 === 12) return "12pm";
  return `${hour24 - 12}pm`;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WET_CONDITIONS = new Set(["rain", "thunderstorm", "drizzle", "snow"]);

/**
 * Decide whether tonight's outlook deserves a heads-up. All hour windows use
 * DEVICE-LOCAL time. Priority: rain > drop > warmup. Returns null when the
 * evening is uneventful (or already over).
 */
export function buildEveningAlert(
  nowTempF: number,
  nowCondition: string,
  forecast: ForecastEntry[],
  now: Date = new Date(),
): EveningAlert | null {
  const nowHour = now.getHours();
  // After 10pm the evening is over — nothing useful to say.
  if (nowHour >= 22) return null;

  const todayEntries = forecast.filter((e) => sameLocalDay(new Date(e.dt * 1000), now));
  if (todayEntries.length === 0) return null;

  // Rain check first: wet weather rolling in between 3pm and 11pm while
  // it's currently dry.
  const nowDry =
    nowCondition.toLowerCase() === "clear" || nowCondition.toLowerCase() === "clouds";
  if (nowDry) {
    const rainEntry = todayEntries.find((e) => {
      const h = new Date(e.dt * 1000).getHours();
      return h >= 15 && h <= 23 && WET_CONDITIONS.has(e.condition.toLowerCase());
    });
    if (rainEntry) {
      const h = formatHour(new Date(rainEntry.dt * 1000).getHours());
      const nowRounded = Math.round(nowTempF);
      return {
        kind: "rain",
        headline: `Rain around ${h} — grab something waterproof`,
        detail: `${nowRounded}° now, wet weather by ${h}`,
      };
    }
  }

  // Evening cooldown: lowest temp between 5pm and 10pm.
  const eveningEntries = todayEntries.filter((e) => {
    const h = new Date(e.dt * 1000).getHours();
    return h >= 17 && h <= 22;
  });
  if (eveningEntries.length > 0) {
    let lowEntry = eveningEntries[0];
    for (const e of eveningEntries) {
      if (e.tempF < lowEntry.tempF) lowEntry = e;
    }
    const low = Math.round(lowEntry.tempF);
    if (Math.round(nowTempF) - low >= 15) {
      const lowHour = formatHour(new Date(lowEntry.dt * 1000).getHours());
      return {
        kind: "drop",
        headline: `${low}° by ${lowHour} — bring a jacket`,
        detail: `${Math.round(nowTempF)}° now, dropping fast after sunset`,
      };
    }
  }

  // Afternoon warmup: peak between 11am and 4pm vs right now.
  const middayEntries = todayEntries.filter((e) => {
    const h = new Date(e.dt * 1000).getHours();
    return h >= 11 && h <= 16;
  });
  if (middayEntries.length > 0) {
    let highEntry = middayEntries[0];
    for (const e of middayEntries) {
      if (e.tempF > highEntry.tempF) highEntry = e;
    }
    const high = Math.round(highEntry.tempF);
    if (high - Math.round(nowTempF) >= 15) {
      const highHour = formatHour(new Date(highEntry.dt * 1000).getHours());
      return {
        kind: "warmup",
        headline: `Up to ${high}° by ${highHour} — wear layers`,
        detail: `${Math.round(nowTempF)}° now, shedding weather by afternoon`,
      };
    }
  }

  return null;
}
