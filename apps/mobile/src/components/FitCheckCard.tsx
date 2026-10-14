import { Image, Text, View } from "react-native";
import type { ClothingItem, WeatherBucket } from "@dripcast/api";
import { bucketColors } from "@dripcast/theme";
import { SLOT_LABELS, type OutfitSlot } from "../lib/outfit";
import { usePalette } from "../store/theme";

/**
 * Shareable fit-check card, designed at 540x675dp and captured at 1080x1350px
 * (IG/TikTok story format) via react-native-view-shot.
 *
 * Pure presentational — all colors come from usePalette() so it renders
 * correctly in both the cyber and clean themes.
 */
interface FitCheckCardProps {
  outfit: Record<OutfitSlot, ClothingItem | null>;
  bucket: WeatherBucket;
  tempF: number;
  condition: string;
  city: string;
}

const CARD_WIDTH = 540;
const CARD_HEIGHT = 675;
const CARD_PADDING = 28;
const GRID_GAP = 12;
const SLOT_ORDER: OutfitSlot[] = ["tops", "bottoms", "shoes", "outerwear"];

export function FitCheckCard({ outfit, bucket, tempF, condition, city }: FitCheckCardProps) {
  const palette = usePalette();
  const accent = bucketColors[bucket];
  const date = new Date().toLocaleDateString("default", { month: "short", day: "numeric" });
  const cellWidth = (CARD_WIDTH - CARD_PADDING * 2 - GRID_GAP) / 2;

  return (
    <View
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: palette.void,
        padding: CARD_PADDING,
      }}
    >
      {/* Top: wordmark + date */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: 1, color: palette.text }}>
          DRIP<Text style={{ color: palette.neonPink }}>CAST</Text>
        </Text>
        <Text style={{ fontSize: 18, fontWeight: "600", color: palette.muted }}>{date}</Text>
      </View>

      {/* Hero strip: temp + condition + bucket */}
      <View
        style={{
          marginTop: 18,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 72, lineHeight: 76, fontWeight: "900", color: palette.text }}>
            {tempF}°F
          </Text>
          <Text style={{ marginTop: 4, fontSize: 20, fontWeight: "600", color: palette.muted }}>
            {condition} · {city}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: `${accent}22`,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: accent, fontSize: 18, fontWeight: "800", textTransform: "capitalize" }}>
            {bucket} day
          </Text>
        </View>
      </View>

      {/* Middle: 2x2 outfit grid */}
      <View style={{ marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP }}>
        {SLOT_ORDER.map((slot) => {
          const item = outfit[slot];
          return (
            <View
              key={slot}
              style={{
                width: cellWidth,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: palette.panel,
                borderWidth: 1,
                borderColor: palette.line,
              }}
            >
              {item ? (
                <View>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: "100%", height: 120 }}
                    resizeMode="cover"
                  />
                  <View style={{ padding: 10 }}>
                    <Text
                      style={{ fontSize: 16, fontWeight: "700", color: palette.text }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={{ marginTop: 3, fontSize: 13, fontWeight: "700", color: palette.muted }}>
                      {SLOT_LABELS[slot]}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    height: 186,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: palette.faint,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: palette.faint }}>
                    No {SLOT_LABELS[slot].toLowerCase()}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Bottom: branding + bucket accent bar */}
      <View style={{ marginTop: "auto", paddingTop: 16 }}>
        <Text style={{ textAlign: "center", fontSize: 17, fontWeight: "600", color: palette.muted }}>
          Styled with DripCast
        </Text>
        <View style={{ marginTop: 10, height: 8, borderRadius: 4, backgroundColor: accent }} />
      </View>
    </View>
  );
}
