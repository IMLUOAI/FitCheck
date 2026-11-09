import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ClothingItem } from "@dripcast/api";
import {
  assembleOutfit,
  conditionNote,
  SLOT_LABELS,
  type OutfitSlot,
} from "../lib/outfit";
import { recommendOil } from "../lib/oilRecommendations";
import type { PersonaId } from "../lib/personas";
import { ShopButton } from "./ShopButton";
import { usePalette } from "../store/theme";

interface DailyComboProps {
  items: ClothingItem[];
  bucket: "hot" | "warm" | "cold";
  condition: string;
  tempF: number;
  personaId: PersonaId | null;
  personaPrefs?: Partial<Record<OutfitSlot, string[]>> | null;
  dirtyIds: Set<string>;
}

const SLOT_ORDER: OutfitSlot[] = ["tops", "bottoms", "shoes", "outerwear"];

/** Local calendar date as YYYYMMDD, so the combo is stable all day. */
function todaySeed(): number {
  const now = new Date();
  return (
    now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  );
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Daily Combo: one full outfit recommendation per day, picked from the
 * closet with the same weather/persona machinery as Today's Fit, but
 * seeded by the calendar date — so today's combo stays the same all day
 * and a fresh one arrives tomorrow. Shuffle rolls a different combo
 * on demand; Reset returns to today's pick.
 */
export function DailyCombo({
  items,
  bucket,
  condition,
  tempF,
  personaId,
  personaPrefs,
  dirtyIds,
}: DailyComboProps) {
  const router = useRouter();
  const palette = usePalette();
  const [seedOverride, setSeedOverride] = useState<number | null>(null);

  if (items.length === 0) {
    return null;
  }

  // Prefer clean pieces; never leave the user with nothing to wear.
  const cleanItems = items.filter((item) => !dirtyIds.has(item._id));
  const outfitItems = cleanItems.length >= 3 ? cleanItems : items;
  const skippedDirty = outfitItems === items ? 0 : items.length - cleanItems.length;

  const { slots } = assembleOutfit(
    outfitItems,
    seedOverride ?? todaySeed(),
    condition,
    personaPrefs ?? null,
  );
  const note = conditionNote(condition);
  // Today's scent: same date seed as the outfit (shuffle rolls a new one).
  const scent = recommendOil(tempF, personaId, seedOverride ?? todaySeed());

  return (
    <View className="mb-4 rounded-2xl border border-line bg-panel p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-text">Daily Combo</Text>
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${palette.neonCyan}26` }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: palette.neonCyan }}
            >
              {todayLabel()}
            </Text>
          </View>
          {note ? (
            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: `${palette.neonPink}26` }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: palette.neonPink }}
              >
                {note}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          {seedOverride !== null ? (
            <Pressable
              onPress={() => setSeedOverride(null)}
              hitSlop={10}
              accessibilityLabel="Back to today's combo"
              className="h-10 items-center justify-center rounded-full border border-line bg-panel-raised px-3"
            >
              <Text className="text-sm font-bold" style={{ color: palette.neonPink }}>
                Today
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setSeedOverride(Date.now())}
            hitSlop={10}
            accessibilityLabel="Shuffle combo"
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-panel-raised"
          >
            <Ionicons name="shuffle" size={20} color={palette.neonPink} />
          </Pressable>
        </View>
      </View>

      {SLOT_ORDER.map((slot) => {
        const item = slots[slot];

        if (!item) {
          return (
            <View
              key={slot}
              className="mb-2.5 rounded-xl border border-line p-3"
              style={{ borderStyle: "dashed" }}
            >
              <Text className="text-sm text-muted">
                No {SLOT_LABELS[slot].toLowerCase()} for {bucket} days
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/closet")} hitSlop={6}>
                <Text className="mt-1 text-sm font-semibold text-neon-pink">
                  Add in Closet
                </Text>
              </Pressable>
            </View>
          );
        }

        return (
          <View
            key={slot}
            className="mb-2.5 flex-row items-center rounded-xl border border-line bg-panel-raised p-2.5"
          >
            <Image
              source={{ uri: item.imageUrl }}
              className="h-16 w-16 rounded-lg"
              resizeMode="cover"
            />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-text" numberOfLines={1}>
                {item.name}
              </Text>
              <View className="mt-1 self-start rounded-full bg-panel px-2 py-0.5">
                <Text className="text-xs font-bold text-muted">{SLOT_LABELS[slot]}</Text>
              </View>
            </View>
            <ShopButton itemName={item.name} />
          </View>
        );
      })}

      {skippedDirty > 0 ? (
        <Pressable onPress={() => router.push("/(tabs)/closet")} hitSlop={6} className="mb-2">
          <Text className="text-sm text-muted">
            Skipped {skippedDirty} dirty {skippedDirty === 1 ? "piece" : "pieces"} —{" "}
            <Text className="font-semibold text-neon-pink">laundry day?</Text>
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => router.push("/(tabs)/oils")}
        className="mt-1 flex-row items-center rounded-xl border border-line bg-panel-raised p-3"
      >
        <View
          className="mr-3 h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${palette.neonPink}26` }}
        >
          <Ionicons name="leaf-outline" size={20} color={palette.neonPink} />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted">
            Today&apos;s scent
          </Text>
          <Text className="mt-0.5 text-base font-bold text-text">{scent.oil.name}</Text>
          <Text className="text-sm text-muted" numberOfLines={2}>
            {scent.reason}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.faint} />
      </Pressable>
    </View>
  );
}
