import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import type { Fit } from "@dripcast/api";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { useFitHistory } from "../../src/hooks/useSocial";
import { usePersona } from "../../src/hooks/usePersona";
import { useAuthStore } from "../../src/store/auth";
import { usePalette } from "../../src/store/theme";
import {
  recommendOil,
  seedFromDateKey,
  tempForBucket,
} from "../../src/lib/oilRecommendations";
import {
  buildMonthGrid,
  dayKey,
  findRepeat,
  groupFitsByDay,
} from "../../src/lib/fitHistory";

const TRIPS_KEY = "dripcast.trips";

interface SavedTripLite {
  destination: string;
  startDate: string;
  endDate: string;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function shortDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const month = new Date(y, m - 1, d).toLocaleString("en-US", { month: "short" });
  return `${month} ${d}`;
}

function FitCard({ fit, allFits }: { fit: Fit; allFits: Fit[] }) {
  const palette = usePalette();
  const repeat = findRepeat(fit, allFits);
  const repeatTint = repeat && repeat.daysAgo === 1 ? palette.danger : palette.warm;
  return (
    <View className="mb-3 rounded-2xl border border-line bg-panel p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">
          {capitalize(fit.weather)}
        </Text>
        {repeat ? (
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${repeatTint}26` }}
          >
            <Text className="text-xs font-bold" style={{ color: repeatTint }}>
              {repeat.daysAgo === 1 ? "Worn yesterday" : `Worn ${repeat.daysAgo} days ago`}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="mt-2.5 flex-row" style={{ gap: 8 }}>
        {fit.items.map((item, idx) => {
          const id = typeof item === "string" ? item : item._id;
          return typeof item === "string" ? (
            <View
              key={`${id}-${idx}`}
              className="items-center justify-center border border-line bg-panel-raised"
              style={{ width: 56, height: 56, borderRadius: 12 }}
            >
              <Ionicons name="shirt-outline" size={24} color={palette.muted} />
            </View>
          ) : (
            <Image
              key={`${id}-${idx}`}
              source={{ uri: item.imageUrl }}
              style={{ width: 56, height: 56, borderRadius: 12 }}
              resizeMode="cover"
            />
          );
        })}
      </View>
      {fit.note ? (
        <Text className="mt-2.5 text-sm leading-5 text-muted">{fit.note}</Text>
      ) : null}
    </View>
  );
}

export default function History() {
  const palette = usePalette();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?._id);
  const history = useFitHistory(userId);
  const { personaId } = usePersona();
  const [trips, setTrips] = useState<SavedTripLite[]>([]);

  // Saved trips live in AsyncStorage; reload whenever the tab gains focus
  // so a trip saved in the Trips tab shows up here without a restart.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void AsyncStorage.getItem(TRIPS_KEY).then((raw) => {
        if (!live || !raw) return;
        try {
          const parsed = JSON.parse(raw) as SavedTripLite[];
          if (Array.isArray(parsed)) setTrips(parsed);
        } catch {
          // Corrupt cache — no trip markers.
        }
      });
      return () => {
        live = false;
      };
    }, []),
  );

  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState(() => dayKey(new Date()));

  const todayKey = useMemo(() => dayKey(new Date()), []);
  const grid = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );
  const weeks = useMemo(() => {
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < grid.length; i += 7) {
      rows.push(grid.slice(i, i + 7));
    }
    return rows;
  }, [grid]);
  const byDay = useMemo(() => groupFitsByDay(history.data ?? []), [history.data]);
  const selectedFits = byDay.get(selectedKey) ?? [];
  const allFits = history.data ?? [];

  const tripForKey = (key: string) =>
    trips.find((t) => t.startDate <= key && key <= t.endDate);
  const selectedTrip = tripForKey(selectedKey);

  // The day's scent, reconstructed from the first fit's weather bucket
  // (past temperatures aren't stored) and the same date seed as the
  // Daily Combo — so History shows the scent that went with the fit.
  const selectedScent = useMemo(() => {
    const firstFit = selectedFits[0];
    const tempF = firstFit ? tempForBucket(firstFit.weather) : 68;
    return recommendOil(tempF, personaId, seedFromDateKey(selectedKey));
  }, [selectedFits, personaId, selectedKey]);

  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  const goMonth = (delta: number) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };
  const goToday = () => {
    setCursor(new Date());
    setSelectedKey(dayKey(new Date()));
  };

  if (!userId) {
    return (
      <Screen>
        <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
          <Text className="text-2xl font-black text-text">History</Text>
        </View>
        <EmptyState
          icon="log-in-outline"
          title="Sign in to see your history"
          subtitle="Your fit calendar lives here once you're signed in."
          actionTitle="Sign in"
          onAction={() => router.push("/(auth)/sign-in")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
          <Text className="text-2xl font-black text-text">History</Text>
          <Pressable
            onPress={goToday}
            className="rounded-full border border-line bg-panel-raised px-4 py-2"
          >
            <Text className="text-sm font-bold text-text">Today</Text>
          </Pressable>
        </View>

        <View className="mb-2 flex-row items-center justify-between px-4">
          <Pressable
            onPress={() => goMonth(-1)}
            hitSlop={12}
            accessibilityLabel="Previous month"
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-panel"
          >
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </Pressable>
          <Text className="text-lg font-bold text-text">{monthLabel}</Text>
          <Pressable
            onPress={() => goMonth(1)}
            hitSlop={12}
            accessibilityLabel="Next month"
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-panel"
          >
            <Ionicons name="chevron-forward" size={20} color={palette.text} />
          </Pressable>
        </View>

        <View className="mb-1 flex-row px-4">
          {WEEKDAYS.map((d, i) => (
            <Text key={i} className="flex-1 text-center text-xs font-semibold text-muted">
              {d}
            </Text>
          ))}
        </View>

        <View className="px-4">
          {weeks.map((week, wi) => (
            <View key={wi} className="flex-row">
              {week.map((cell, ci) => {
                if (!cell) {
                  return <View key={`pad-${ci}`} className="flex-1" style={{ aspectRatio: 1 }} />;
                }
                const key = dayKey(cell);
                const count = byDay.get(key)?.length ?? 0;
                const isToday = key === todayKey;
                const isSelected = key === selectedKey;
                const onTrip = tripForKey(key) !== undefined;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedKey(key)}
                    className="flex-1 items-center justify-center"
                    style={{ aspectRatio: 1 }}
                  >
                    {onTrip ? (
                      <Text className="absolute right-0.5 top-0.5 text-[10px]">✈️</Text>
                    ) : null}
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-full ${
                        isSelected ? "bg-neon-pink" : isToday ? "border border-neon-pink" : ""
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected ? "text-white" : "text-text"
                        }`}
                      >
                        {cell.getDate()}
                      </Text>
                    </View>
                    {count === 0 ? (
                      <View className="mt-1 h-1.5" />
                    ) : count === 1 ? (
                      <View className="mt-1 h-1.5 w-1.5 rounded-full bg-neon-pink" />
                    ) : (
                      <Text className="mt-0.5 text-[10px] font-bold text-neon-pink">
                        {count}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View className="mt-4 px-4">
          <Text className="mb-3 text-base font-bold text-text">
            {shortDayLabel(selectedKey)} · {selectedFits.length}{" "}
            {selectedFits.length === 1 ? "fit" : "fits"}
          </Text>
          {selectedTrip ? (
            <Pressable
              onPress={() => router.push("/(tabs)/trips")}
              className="mb-3 flex-row items-center rounded-2xl border border-line bg-panel px-4 py-3"
            >
              <Ionicons name="airplane" size={18} color={palette.neonCyan} />
              <Text className="ml-2 flex-1 text-sm font-bold text-text" numberOfLines={1}>
                Trip: {selectedTrip.destination}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={palette.faint} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push("/(tabs)/oils")}
            className="mb-3 flex-row items-center rounded-2xl border border-line bg-panel px-4 py-3"
          >
            <Ionicons name="leaf-outline" size={18} color={palette.neonPink} />
            <View className="ml-2 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted">
                Scent that day
              </Text>
              <Text className="mt-0.5 text-sm font-bold text-text">
                {selectedScent.oil.name}
              </Text>
              <Text className="text-xs text-muted" numberOfLines={2}>
                {selectedScent.reason}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.faint} />
          </Pressable>
          {history.isPending ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator color={palette.neonPink} />
            </View>
          ) : history.isError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load your history"
              subtitle="Check your connection and try again."
              actionTitle="Retry"
              onAction={() => history.refetch()}
            />
          ) : allFits.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No fits logged yet"
              subtitle="Save outfits from Today's Fit with the bookmark icon."
            />
          ) : selectedFits.length === 0 ? (
            <Text className="py-6 text-center text-sm text-muted">
              No fits logged this day.
            </Text>
          ) : (
            selectedFits.map((fit) => (
              <FitCard key={fit._id} fit={fit} allFits={allFits} />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
