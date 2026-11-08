import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePalette } from "../store/theme";
import { quoteForDate } from "../lib/dailyLit";

/** Daily British literature card for the Today tab. */
export function DailyLitCard() {
  const palette = usePalette();
  const quote = quoteForDate(new Date());
  return (
    <View className="mb-4 rounded-2xl border border-line bg-panel p-4">
      <View className="mb-2 flex-row items-center">
        <Ionicons name="book-outline" size={18} color={palette.neonPink} />
        <Text className="ml-2 text-xs font-bold uppercase tracking-widest text-muted">
          Today&apos;s page
        </Text>
      </View>
      <Text
        className="text-base italic leading-6 text-text"
        style={{ fontFamily: "Georgia" }}
      >
        &ldquo;{quote.text}&rdquo;
      </Text>
      <Text className="mt-2 text-right text-sm text-muted">
        — {quote.author}, <Text className="italic">{quote.work}</Text>
      </Text>
    </View>
  );
}
