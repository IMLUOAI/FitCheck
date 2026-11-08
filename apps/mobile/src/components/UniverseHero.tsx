import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { PERSONAS, type PersonaId } from "../lib/personas";
import { usePersona } from "../hooks/usePersona";
import { useWeather } from "../hooks/useWeather";
import { useIsPro } from "../store/useSubscription";

/**
 * UniverseHero — the homepage's signature scene.
 *
 * Earth is you, fixed at the centre of your universe. Every other planet
 * is a style world, orbiting on its own ellipse. Tapping a planet picks
 * that persona (same state as the Vibe chips — they stay in sync through
 * usePersona's shared cache). Tapping Earth clears it.
 *
 * Motion: each planet loops its orbit with React Native's Animated API
 * (no new dependencies). Orbital periods keep the real relative order —
 * Mercury fastest, Neptune slowest — time-lapsed so the motion is
 * visible. True scale would leave Neptune effectively frozen (one orbit
 * takes 165 years), so the periods are compressed, not the order.
 *
 * The panel is a fixed night-sky window: its colours are hardcoded space
 * tones on purpose, so the scene looks the same in every theme — a dark
 * cosmic card inside the light Blush theme, not a theme token.
 */

interface Planet {
  id: PersonaId;
  planet: string;
  color: string;
  size: number;
  /** Orbit radii (elliptical, to fit a phone screen). */
  rx: number;
  ry: number;
  /** One full orbit, milliseconds (real relative order, time-lapsed). */
  periodMs: number;
  ring?: boolean;
}

const PLANETS: Planet[] = [
  { id: "vintage", planet: "Mercury", color: "#B8C0CC", size: 18, rx: 53, ry: 33, periodMs: 24000 },
  { id: "clean-girl", planet: "Venus", color: "#E3B76A", size: 24, rx: 74, ry: 46, periodMs: 36000 },
  { id: "streetwear", planet: "Mars", color: "#D9480F", size: 22, rx: 95, ry: 59, periodMs: 54000 },
  { id: "y2k", planet: "Jupiter", color: "#D9A05B", size: 34, rx: 116, ry: 72, periodMs: 84000 },
  { id: "old-money", planet: "Saturn", color: "#C9A86A", size: 26, rx: 138, ry: 86, periodMs: 110000, ring: true },
  { id: "alt", planet: "Uranus", color: "#8FC7D6", size: 22, rx: 159, ry: 99, periodMs: 140000 },
  { id: "gorpcore", planet: "Neptune", color: "#3B5BDB", size: 22, rx: 179, ry: 111, periodMs: 170000 },
];

const STARS: Array<{ left: string; top: string; size: number; opacity: number }> = [
  { left: "8%", top: "6%", size: 2, opacity: 0.9 },
  { left: "30%", top: "12%", size: 2, opacity: 0.6 },
  { left: "55%", top: "4%", size: 2, opacity: 0.8 },
  { left: "90%", top: "28%", size: 2, opacity: 0.6 },
  { left: "16%", top: "46%", size: 2, opacity: 0.5 },
  { left: "44%", top: "88%", size: 2, opacity: 0.7 },
  { left: "88%", top: "56%", size: 2, opacity: 0.5 },
  { left: "62%", top: "24%", size: 2, opacity: 0.4 },
];

/** Keyframes for one full orbit: 0 and 1 are the same point, so the loop is seamless. */
const STEPS = 12;
const INPUT_RANGE = Array.from({ length: STEPS + 1 }, (_, i) => i / STEPS);

function OrbitingPlanet({
  planet,
  selected,
  locked,
  onPress,
}: {
  planet: Planet;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const persona = PERSONAS.find((p) => p.id === planet.id)!;
  const progress = useRef(new Animated.Value(Math.random())).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: planet.periodMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, planet.periodMs]);

  const translateX = progress.interpolate({
    inputRange: INPUT_RANGE,
    outputRange: INPUT_RANGE.map((t) => planet.rx * Math.cos(t * 2 * Math.PI)),
  });
  const translateY = progress.interpolate({
    inputRange: INPUT_RANGE,
    outputRange: INPUT_RANGE.map((t) => planet.ry * Math.sin(t * 2 * Math.PI)),
  });

  return (
    <Animated.View
      style={[
        styles.planetAnchor,
        { marginLeft: -planet.size / 2, marginTop: -planet.size / 2, transform: [{ translateX }, { translateY }] },
        locked ? { opacity: 0.55 } : null,
      ]}
    >
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${planet.planet} — ${persona.label} style world${locked ? " (Pro)" : ""}`}
        accessibilityState={{ selected }}
        style={{ alignItems: "center" }}
      >
        <View
          style={[
            styles.planet,
            {
              width: planet.size,
              height: planet.size,
              borderRadius: planet.size / 2,
              backgroundColor: planet.color,
              shadowColor: planet.color,
              borderWidth: selected ? 2 : 0,
              borderColor: "#FFFFFF",
            },
          ]}
        >
          {planet.ring ? <View style={styles.saturnRing} /> : null}
        </View>
        <Text style={[styles.planetLabel, selected ? styles.planetLabelActive : null]}>{planet.planet}</Text>
        <Text style={styles.personaLabel}>
          {persona.label}
          {locked ? " 🔒" : ""}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Coordinates as a short readout, e.g. "33.02°N 96.70°W". */
function formatCoords(lat: number, lon: number): string {
  const la = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
  return `${la} ${lo}`;
}

interface UniverseHeroProps {
  /** Short Earth subtitle, e.g. "54°F in Plano, TX". Empty while loading. */
  earthSub?: string;
  /** Opens the paywall when a locked (Pro) planet is tapped. */
  onLocked: () => void;
}

export function UniverseHero({ earthSub, onLocked }: UniverseHeroProps) {
  const { personaId, setPersonaId } = usePersona();
  const isPro = useIsPro();
  const weather = useWeather();
  const w = weather.data;
  const active = PERSONAS.find((p) => p.id === personaId);

  const selectPlanet = (planet: Planet) => {
    const index = PERSONAS.findIndex((p) => p.id === planet.id);
    // Free tier: "All" + the first persona; the rest are Pro (same rule
    // as the Vibe chips).
    const locked = !isPro && index > 0;
    if (locked) {
      onLocked();
      return;
    }
    void setPersonaId(planet.id);
  };

  return (
    <View style={styles.panel}>
      {STARS.map((s, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: "#FFFFFF",
            opacity: s.opacity,
          }}
        />
      ))}

      <View style={styles.headerRow}>
        <Text style={styles.kicker}>Your universe</Text>
        <Text style={styles.worldsCount}>7 worlds</Text>
      </View>

      <View style={styles.scene}>
        {PLANETS.map((planet) => (
          <View
            key={`orbit-${planet.id}`}
            style={[
              styles.orbit,
              {
                width: planet.rx * 2,
                height: planet.ry * 2,
                marginLeft: -planet.rx,
                marginTop: -planet.ry,
              },
            ]}
          />
        ))}

        {PLANETS.map((planet) => {
          const index = PERSONAS.findIndex((p) => p.id === planet.id);
          const locked = !isPro && index > 0;
          return (
            <OrbitingPlanet
              key={planet.id}
              planet={planet}
              selected={personaId === planet.id}
              locked={locked}
              onPress={() => selectPlanet(planet)}
            />
          );
        })}

        <Pressable
          onPress={() => void setPersonaId(null)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Earth — your style, no persona"
          accessibilityState={{ selected: personaId === null }}
          style={[styles.planetAnchor, styles.earthAnchor]}
        >
          <View style={styles.earth}>
            <View style={styles.earthHighlight} />
          </View>
          <Text style={[styles.planetLabel, styles.planetLabelActive]}>YOU · Earth</Text>
          <Text style={styles.personaLabel}>{earthSub || "Reading the sky…"}</Text>
        </Pressable>

        {/* Weather telemetry, right in the orbit corner — bright, on a glass pill. */}
        <View style={styles.telemetry}>
          <Text style={styles.telemetryTitle}>EARTH · LIVE</Text>
          {w ? (
            <>
              <Text style={styles.telemetryLine}>{formatCoords(w.latitude, w.longitude)}</Text>
              <Text style={styles.telemetryLine}>
                {w.tempF}°F FEELS {w.feelsLikeF}°F HUM {w.humidity}%
              </Text>
              <Text style={styles.telemetryLine}>
                WIND {w.windMph} MPH {w.pressureHpa} HPA
                {w.visibilityMiles !== undefined ? ` VIS ${w.visibilityMiles} MI` : ""}
              </Text>
            </>
          ) : (
            <Text style={styles.telemetryLine}>READING THE SKY…</Text>
          )}
        </View>
      </View>

      <Text style={styles.activeLine}>
        {active ? `${active.emoji} ${active.label} — ${active.blurb}` : "🌍 Your style — every world, your call"}
      </Text>
      <Text style={styles.hint}>Planets orbit at real relative speeds, time-lapsed · Tap one to change your vibe</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#05060F",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#232A4D",
    padding: 14,
    marginBottom: 16,
    marginHorizontal: -16,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800",
    color: "#22D3EE",
    textTransform: "uppercase",
  },
  worldsCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9AA3C7",
  },
  telemetry: {
    position: "absolute",
    top: 10,
    right: 10,
    alignItems: "flex-end",
    backgroundColor: "rgba(5,6,15,0.55)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  telemetryTitle: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "800",
    color: "#22D3EE",
  },
  telemetryLine: {
    fontFamily: "monospace",
    fontSize: 10,
    lineHeight: 14,
    color: "#DDE3FF",
    textAlign: "right",
  },
  scene: {
    position: "relative",
    height: 300,
  },
  orbit: {
    position: "absolute",
    left: "50%",
    top: "50%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
  },
  planetAnchor: {
    position: "absolute",
    left: "50%",
    top: "50%",
    alignItems: "center",
  },
  planet: {
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  saturnRing: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 48,
    height: 12,
    marginLeft: -24,
    marginTop: -6,
    borderWidth: 1.5,
    borderColor: "rgba(243,227,194,0.9)",
    borderRadius: 999,
    transform: [{ rotate: "-18deg" }],
  },
  planetLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#F4F6FF",
  },
  planetLabelActive: {
    color: "#FFFFFF",
  },
  personaLabel: {
    fontSize: 9,
    color: "#9AA3C7",
  },
  earthAnchor: {
    marginLeft: -30,
    marginTop: -30,
  },
  earth: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1971C2",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    shadowColor: "#4AA8FF",
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  earthHighlight: {
    position: "absolute",
    left: 10,
    top: 9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#9CD6FF",
    opacity: 0.7,
  },
  activeLine: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#F4F6FF",
  },
  hint: {
    marginTop: 2,
    fontSize: 11,
    color: "#5B648C",
  },
});
