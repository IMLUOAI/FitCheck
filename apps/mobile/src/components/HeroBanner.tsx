import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { WeatherBucket } from "@dripcast/api";
import { useWeather } from "../hooks/useWeather";
import { useHeroMode, useSetHeroMode } from "../hooks/useHeroMode";
import { useIsPro } from "../store/useSubscription";
import { Paywall } from "./Paywall";
import { usePalette } from "../store/theme";
import { conditionLabel } from "../lib/weather";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";

/**
 * Wide banner on the home screen. Album mode rotates through the user's
 * album photos — tap shuffle for a new one, or flip back to weather art.
 *
 * Weather mode is a LIVING SKY: a real photographic sky for the current
 * condition that slowly breathes (Ken Burns zoom), with the weather
 * playing out over it — heavy rain, swaying snow, two layers of drifting
 * clouds, a sun with slowly turning rays, twinkling stars and an
 * occasional shooting star, lightning in storms — plus Earth rising as
 * the horizon, the condition in big type, and a bucket-coloured neon
 * edge. No character art, so nothing here needs the birthday gate.
 */

const BANNER_HEIGHT = 208;
const EARTH_SIZE = 180;

const BUCKET_GLOW: Record<WeatherBucket, string> = {
  hot: "#FF6B4A",
  warm: "#FFC24B",
  cold: "#4AA8FF",
};

/** Bundled photographic skies, one per condition family. */
const BACKGROUND_PHOTOS = {
  "clear-day": require("../../assets/weather/clear-day.jpg"),
  "clear-night": require("../../assets/weather/clear-night.jpg"),
  rain: require("../../assets/weather/rain.jpg"),
  snow: require("../../assets/weather/snow.jpg"),
};

function backgroundPhoto(condition: string, isDay: boolean) {
  const cond = condition.toLowerCase();
  if (cond === "clear") return isDay ? BACKGROUND_PHOTOS["clear-day"] : BACKGROUND_PHOTOS["clear-night"];
  if (cond === "rain" || cond === "drizzle" || cond === "thunderstorm") return BACKGROUND_PHOTOS.rain;
  return BACKGROUND_PHOTOS.snow; // snow, clouds, mist, fog, haze
}

/** Deterministic pseudo-random 0–1 from a seed, so layouts are stable. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** The sky photo, slowly breathing in and out. */
function BreathingPhoto({ source, label }: { source: ImageSourcePropType; label: string }) {
  const zoom = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(zoom, {
        toValue: 1,
        duration: 14000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [zoom]);

  const scale = zoom.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.07, 1],
  });

  return (
    <Animated.View
      style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, transform: [{ scale }] }}
    >
      <Image source={source} accessibilityLabel={label} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
    </Animated.View>
  );
}

/** One falling streak (rain) or flake (snow). Loops top-to-bottom. */
function Falling({
  leftPct,
  size,
  length,
  durationMs,
  opacity,
  seed,
  sway = 0,
}: {
  leftPct: number;
  size: number;
  length: number;
  durationMs: number;
  opacity: number;
  seed: number;
  /** Horizontal drift in px (snow sways, rain falls straight). */
  sway?: number;
}) {
  const progress = useRef(new Animated.Value(rand(seed))).current;
  const swayValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, durationMs]);
  useEffect(() => {
    if (sway <= 0) return;
    const loop = Animated.loop(
      Animated.timing(swayValue, {
        toValue: 1,
        duration: 2400 + rand(seed + 500) * 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sway, swayValue, seed]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, BANNER_HEIGHT + 30],
  });
  const translateX = swayValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, sway, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: 0,
        width: size,
        height: length,
        borderRadius: size / 2,
        backgroundColor: "#FFFFFF",
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: "12deg" }],
      }}
    />
  );
}

/** One cloud blob drifting across the sky. Loops off-screen to off-screen. */
function DriftingCloud({
  top,
  width,
  height,
  durationMs,
  opacity,
  seed,
  reverse = false,
}: {
  top: number;
  width: number;
  height: number;
  durationMs: number;
  opacity: number;
  seed: number;
  reverse?: boolean;
}) {
  const screenWidth = Dimensions.get("window").width;
  const progress = useRef(new Animated.Value(rand(seed))).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, durationMs]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? [screenWidth + 40, -width - 40] : [-width - 40, screenWidth + 40],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        top,
        left: 0,
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: "#FFFFFF",
        opacity,
        transform: [{ translateX }],
      }}
    />
  );
}

/** Occasional lightning flash for thunderstorms. */
function Lightning() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.82, 0.86, 0.9, 0.94, 1],
    outputRange: [0, 0, 0.35, 0.05, 0.3, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "#FFFFFF",
        opacity,
      }}
    />
  );
}

/** Sun with slowly turning rays (clear days). */
function SunRays() {
  const rotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 42000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const spokes = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <View
      style={{
        position: "absolute",
        right: 10,
        top: 8,
        width: 96,
        height: 96,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{ position: "absolute", width: 96, height: 96, transform: [{ rotate: spin }] }}
      >
        {spokes.map((deg) => (
          <View
            key={deg}
            style={{ position: "absolute", width: 96, height: 96, transform: [{ rotate: `${deg}deg` }] }}
          >
            <View
              style={{
                position: "absolute",
                left: 47,
                top: 0,
                width: 2,
                height: 15,
                borderRadius: 1,
                backgroundColor: "#FFD66B",
                opacity: 0.85,
              }}
            />
          </View>
        ))}
      </Animated.View>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: "#FFD66B",
          shadowColor: "#FFD66B",
          shadowOpacity: 0.9,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        }}
      />
    </View>
  );
}

/** Moon with a soft halo (clear nights). */
function MoonGlow() {
  return (
    <View
      style={{
        position: "absolute",
        right: 18,
        top: 14,
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 76,
          height: 76,
          borderRadius: 38,
          backgroundColor: "#E8EDFF",
          opacity: 0.12,
        }}
      />
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "#E8EDFF",
          shadowColor: "#E8EDFF",
          shadowOpacity: 0.9,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        }}
      />
    </View>
  );
}

const NIGHT_STARS: Array<{ leftPct: number; top: number; size: number }> = [
  { leftPct: 8, top: 150, size: 2 },
  { leftPct: 20, top: 70, size: 2 },
  { leftPct: 35, top: 120, size: 2 },
  { leftPct: 55, top: 50, size: 2 },
  { leftPct: 70, top: 140, size: 2 },
  { leftPct: 88, top: 90, size: 2 },
  { leftPct: 45, top: 160, size: 2 },
  { leftPct: 60, top: 30, size: 2 },
];

/** A star that gently twinkles. */
function TwinkleStar({ leftPct, top, size, seed }: { leftPct: number; top: number; size: number; seed: number }) {
  const progress = useRef(new Animated.Value(rand(seed))).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1800 + rand(seed + 9) * 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, seed]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.25, 1, 0.25],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#FFFFFF",
        opacity,
      }}
    />
  );
}

/** A shooting star that crosses the sky every few seconds (clear nights). */
function ShootingStar() {
  const screenWidth = Dimensions.get("window").width;
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, screenWidth + 80],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 130],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 0.58, 0.66, 1],
    outputRange: [0, 0, 0.9, 0, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        top: 20,
        width: 48,
        height: 2,
        borderRadius: 1,
        backgroundColor: "#FFFFFF",
        opacity,
        transform: [{ translateX }, { translateY }, { rotate: "-28deg" }],
      }}
    />
  );
}

/** Pulsing dot for the LIVE chip. */
function PulseDot({ color }: { color: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.35, 1],
  });

  return (
    <Animated.View
      style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, marginRight: 6, opacity }}
    />
  );
}

interface HeroBannerProps {
  bucket: WeatherBucket;
}

/** Deterministic daily index so the album hero changes once a day. */
function dayIndex(count: number): number {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return count === 0 ? 0 : (h >>> 0) % count;
}

export function HeroBanner({ bucket }: HeroBannerProps) {
  const palette = usePalette();
  const router = useRouter();
  const weather = useWeather();
  const condition = weather.data?.condition ?? "Clear";
  const isDay = weather.data?.isDay ?? true;
  const city = weather.data?.city ?? "";
  const description = weather.data?.description ?? "";
  const descCap = description ? description.charAt(0).toUpperCase() + description.slice(1) : "";
  const { data: mode = "weather" } = useHeroMode();
  const setMode = useSetHeroMode();
  const isPro = useIsPro();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [shuffleBump, setShuffleBump] = useState(0);
  const gallery = useQuery({
    queryKey: queryKeys.gallery,
    queryFn: () => api.getGallery(),
    staleTime: 60_000,
  });

  const toggleMode = () => {
    // Album shuffle is a Pro feature — free users get the paywall instead.
    if (mode === "weather" && !isPro) {
      setPaywallOpen(true);
      return;
    }
    setMode.mutate(mode === "weather" ? "album" : "weather");
  };

  const paywall = (
    <Paywall
      visible={paywallOpen}
      onClose={() => setPaywallOpen(false)}
      contextMessage="Go Pro to shuffle your album photos as the hero."
    />
  );

  const controls = (
    <View className="absolute bottom-2 right-2 flex-row" style={{ gap: 8 }}>
      {mode === "album" ? (
        <Pressable
          onPress={() => setShuffleBump((n) => n + 1)}
          hitSlop={8}
          accessibilityLabel="Shuffle album photo"
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(5,6,15,0.75)" }}
        >
          <Ionicons name="shuffle" size={18} color={palette.text} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={toggleMode}
        hitSlop={8}
        accessibilityLabel={
          mode === "weather" ? "Show album photos" : "Show weather art"
        }
        className="h-9 items-center justify-center rounded-full px-3"
        style={{ backgroundColor: "rgba(5,6,15,0.75)" }}
      >
        <View className="flex-row items-center">
          <Ionicons
            name={mode === "weather" ? "images-outline" : "partly-sunny-outline"}
            size={18}
            color={palette.text}
          />
          <Text className="ml-1.5 text-xs font-bold text-text">
            {mode === "weather" ? "Album" : "Weather"}
          </Text>
        </View>
      </Pressable>
    </View>
  );

  if (mode === "album") {
    const photos = (gallery.data ?? []).filter((g) => g.kind === "photo");
    if (photos.length > 0) {
      const photo = photos[(dayIndex(photos.length) + shuffleBump) % photos.length]!;
      return (
        <>
          <View className="overflow-hidden rounded-2xl border border-line">
            <Image
              source={{ uri: photo.url }}
              accessibilityLabel="Album photo"
              className="h-52 w-full"
              resizeMode="cover"
            />
            {controls}
          </View>
          {paywall}
        </>
      );
    }
    if (!gallery.isPending) {
      return (
        <>
          <View className="overflow-hidden rounded-2xl border border-line">
          <View className="h-52 w-full items-center justify-center bg-panel p-6">
            <Ionicons name="images-outline" size={32} color={palette.muted} />
            <Text className="mt-2 text-center text-sm text-muted">
              No album photos yet — add some in the Album tab and they&apos;ll
              rotate here.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/album")}
              hitSlop={8}
              className="mt-3 rounded-full bg-panel-raised px-4 py-2"
            >
              <Text className="text-sm font-bold text-neon-pink">Go to Album</Text>
            </Pressable>
          </View>
          {controls}
        </View>
        {paywall}
        </>
      );
    }
  }

  const cond = condition.toLowerCase();
  const isRain = cond === "rain" || cond === "drizzle";
  const isSnow = cond === "snow";
  const isStorm = cond === "thunderstorm";
  const isCloudy = cond === "clouds" || cond === "mist" || cond === "fog" || cond === "haze";
  const isClear = cond === "clear";
  const glow = BUCKET_GLOW[bucket];

  return (
    <>
      <View
        className="overflow-hidden rounded-2xl border border-line"
        style={{ height: BANNER_HEIGHT, backgroundColor: "#05060F" }}
      >
        {/* Real photographic sky, slowly breathing. */}
        <BreathingPhoto source={backgroundPhoto(condition, isDay)} label={`${conditionLabel(condition)} sky`} />

        {/* Night sky life. */}
        {!isDay && isClear ? (
          <>
            {NIGHT_STARS.map((s, i) => (
              <TwinkleStar key={i} leftPct={s.leftPct} top={s.top} size={s.size} seed={i + 1} />
            ))}
            <ShootingStar />
            <MoonGlow />
          </>
        ) : null}

        {/* Sun with turning rays. */}
        {isDay && isClear ? <SunRays /> : null}

        {/* Atmosphere glow behind the planet, tinted by the weather bucket. */}
        <View
          style={{
            position: "absolute",
            left: "50%",
            top: BANNER_HEIGHT - EARTH_SIZE / 2 - 40,
            width: EARTH_SIZE + 56,
            height: EARTH_SIZE + 56,
            marginLeft: -(EARTH_SIZE + 56) / 2,
            borderRadius: (EARTH_SIZE + 56) / 2,
            backgroundColor: glow,
            opacity: 0.16,
          }}
        />

        {/* Earth, rising from the bottom edge as the horizon. */}
        <View
          style={{
            position: "absolute",
            left: "50%",
            top: BANNER_HEIGHT - EARTH_SIZE / 2 + 6,
            width: EARTH_SIZE,
            height: EARTH_SIZE,
            marginLeft: -EARTH_SIZE / 2,
            borderRadius: EARTH_SIZE / 2,
            backgroundColor: "#1971C2",
            borderWidth: 2,
            borderColor: glow,
            shadowColor: glow,
            shadowOpacity: 0.55,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
            overflow: "hidden",
          }}
        >
          {/* Ocean highlight + a soft cloud swirl on the planet. */}
          <View
            style={{
              position: "absolute",
              left: 24,
              top: 18,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#9CD6FF",
              opacity: 0.55,
            }}
          />
          <View
            style={{
              position: "absolute",
              left: 84,
              top: 44,
              width: 70,
              height: 18,
              borderRadius: 9,
              backgroundColor: "#FFFFFF",
              opacity: 0.22,
            }}
          />
          <View
            style={{
              position: "absolute",
              left: 40,
              top: 66,
              width: 52,
              height: 13,
              borderRadius: 7,
              backgroundColor: "#FFFFFF",
              opacity: 0.16,
            }}
          />
        </View>

        {/* Live weather, playing out over the planet. */}
        {isRain &&
          Array.from({ length: 18 }, (_, i) => (
            <Falling
              key={i}
              leftPct={3 + rand(i + 1) * 94}
              size={2}
              length={13 + rand(i + 21) * 6}
              durationMs={800 + rand(i + 41) * 500}
              opacity={cond === "drizzle" ? 0.35 : 0.55}
              seed={i + 1}
            />
          ))}
        {isSnow &&
          Array.from({ length: 16 }, (_, i) => (
            <Falling
              key={i}
              leftPct={3 + rand(i + 61) * 94}
              size={4 + rand(i + 71) * 2}
              length={4 + rand(i + 71) * 2}
              durationMs={3600 + rand(i + 81) * 2400}
              opacity={0.9}
              seed={i + 61}
              sway={6 + rand(i + 91) * 6}
            />
          ))}
        {isStorm && (
          <>
            {Array.from({ length: 12 }, (_, i) => (
              <Falling
                key={i}
                leftPct={3 + rand(i + 101) * 94}
                size={2}
                length={15 + rand(i + 121) * 6}
                durationMs={650 + rand(i + 141) * 300}
                opacity={0.6}
                seed={i + 101}
              />
            ))}
            <Lightning />
          </>
        )}
        {isCloudy && (
          <>
            <DriftingCloud top={30} width={110} height={26} durationMs={42000} opacity={0.14} seed={1} />
            <DriftingCloud top={80} width={140} height={32} durationMs={55000} opacity={0.12} seed={2} />
            <DriftingCloud top={130} width={100} height={24} durationMs={38000} opacity={0.16} seed={3} />
            <DriftingCloud top={55} width={170} height={40} durationMs={26000} opacity={0.1} seed={4} reverse />
            <DriftingCloud top={110} width={150} height={36} durationMs={32000} opacity={0.09} seed={5} reverse />
          </>
        )}

        {/* Live caption. */}
        <View
          className="absolute left-2 top-2 flex-row items-center rounded-full px-3 py-1.5"
          style={{ backgroundColor: "rgba(5,6,15,0.65)" }}
        >
          <PulseDot color={glow} />
          <Text className="text-xs font-bold text-text">LIVE FROM EARTH</Text>
        </View>

        {/* Big condition word. */}
        <View style={{ position: "absolute", left: 16, top: 46, right: 116 }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: 32,
              fontWeight: "900",
              letterSpacing: 2,
              color: "#FFFFFF",
              textShadowColor: "rgba(0,0,0,0.5)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}
          >
            {conditionLabel(condition).toUpperCase()}
          </Text>
          {city ? (
            <Text
              style={{
                marginTop: 2,
                fontSize: 12,
                fontWeight: "600",
                color: "rgba(255,255,255,0.9)",
                textShadowColor: "rgba(0,0,0,0.55)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {city}
              {descCap ? ` · ${descCap}` : ""}
            </Text>
          ) : null}
        </View>

        {/* Bucket-coloured neon edge. */}
        <View
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: glow, opacity: 0.9 }}
        />

        {controls}
      </View>
      {paywall}
    </>
  );
}
