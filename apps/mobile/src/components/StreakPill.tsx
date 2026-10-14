import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { recordVisit } from "../lib/streak";
import { usePalette } from "../store/theme";

/**
 * Daily streak badge for the home header. Records today's visit on mount
 * (non-blocking — renders nothing until the count resolves) and shows a
 * flame + day count, fully theme-aware.
 */
export function StreakPill() {
  const palette = usePalette();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void recordVisit().then(({ count }) => {
      if (alive) setCount(count);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (count === null) return null;

  return (
    <View className="flex-row items-center gap-1 rounded-full border border-line bg-panel px-3 py-2">
      <Ionicons name="flame" size={16} color={palette.hot} />
      <Text className="text-sm font-bold text-text">{count}</Text>
    </View>
  );
}
