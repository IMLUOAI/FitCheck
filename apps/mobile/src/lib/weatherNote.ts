/**
 * A short, caring weather note for the Today tab — plain words about
 * what the weather feels like and what to do about it. Always returns
 * a line (never null) so the tab never feels silent about the weather.
 */
export function buildWeatherNote(tempF: number, condition: string): string {
  const c = condition.toLowerCase();

  if (c.includes("thunder") || c === "rain" || c === "drizzle") {
    if (tempF < 50) return "Cold and wet — waterproof layers, stay dry out there.";
    return "Rain around — grab something waterproof.";
  }
  if (c === "snow") return "Snow falling — warm boots and a real coat.";
  if (tempF < 32) return "Freezing out — bundle up, every layer counts.";
  if (tempF < 50) return "Chilly one — don't skip the warm layer.";
  if (tempF < 66) return "Cool and crisp — a jacket will treat you right.";
  if (tempF >= 80) return "Hot one — stay cool and drink some water.";
  return "Lovely day — light fabrics, easy fits.";
}
