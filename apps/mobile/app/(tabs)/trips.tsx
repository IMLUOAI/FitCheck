import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { TextField } from "../../src/components/TextField";
import { Button } from "../../src/components/Button";
import { Paywall } from "../../src/components/Paywall";
import { useIsPro } from "../../src/store/useSubscription";
import { api } from "../../src/lib/api";
import { queryKeys } from "../../src/lib/queryKeys";
import { usePalette } from "../../src/store/theme";
import { useLaundry } from "../../src/hooks/useLaundry";
import { usePersona } from "../../src/hooks/usePersona";
import {
  addDays,
  buildDayForecasts,
  buildPackingList,
  fetchTripForecast,
  geocodeCity,
  parseDateKey,
  toDateKey,
  validateTripInput,
  type PackingList,
} from "../../src/lib/tripPacker";
import { SLOT_LABELS, type OutfitSlot } from "../../src/lib/outfit";

const TRIPS_KEY = "dripcast.trips";
const MAX_TRIP_DAYS = 14;

interface SavedTrip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  packingList: PackingList;
}

const SLOT_ORDER: OutfitSlot[] = ["tops", "bottoms", "shoes", "outerwear"];

function prettyDate(key: string): string {
  const d = parseDateKey(key);
  if (!d) return key;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function bucketEmoji(bucket: string): string {
  if (bucket === "hot") return "🔥";
  if (bucket === "warm") return "🌤️";
  return "❄️";
}

export default function TripsScreen() {
  const palette = usePalette();
  const router = useRouter();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState(() => addDays(todayKey, 3));
  const [packing, setPacking] = useState<PackingList | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const isPro = useIsPro();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const itemsQuery = useQuery({ queryKey: queryKeys.items, queryFn: () => api.getItems() });
  const { dirtyIds } = useLaundry();
  const { persona } = usePersona();

  useEffect(() => {
    void AsyncStorage.getItem(TRIPS_KEY).then((raw) => {
      if (!raw) return;
      try {
        setSavedTrips(JSON.parse(raw) as SavedTrip[]);
      } catch {
        // Corrupt cache — start fresh.
      }
    });
  }, []);

  const persistTrips = useCallback((trips: SavedTrip[]) => {
    setSavedTrips(trips);
    void AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips)).catch(() => {});
  }, []);

  const build = useCallback(async () => {
    const apiKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
    if (!apiKey) {
      setBuildError("Missing EXPO_PUBLIC_WEATHER_API_KEY — add it to apps/mobile/.env");
      return;
    }
    const invalid = validateTripInput(destination, startDate, endDate, todayKey);
    if (invalid) {
      setBuildError(invalid);
      return;
    }
    const items = itemsQuery.data ?? [];
    setBuilding(true);
    setBuildError(null);
    try {
      const geo = await geocodeCity(destination.trim(), apiKey);
      const { entries, tzOffset } = await fetchTripForecast(geo.lat, geo.lon, apiKey);
      const dayForecasts = buildDayForecasts(entries, tzOffset, startDate, endDate);
      const list = buildPackingList({
        items,
        dayForecasts,
        destination: geo.displayName,
        startDate,
        endDate,
        dirtyIds,
        persona,
      });
      setPacking(list);
      setChecked(new Set());
    } catch (err) {
      setBuildError(
        err instanceof Error ? err.message : "Couldn't build the packing list. Try again.",
      );
    } finally {
      setBuilding(false);
    }
  }, [destination, startDate, endDate, todayKey, itemsQuery.data, dirtyIds, persona]);

  const saveTrip = useCallback(() => {
    if (!packing) return;
    const trip: SavedTrip = {
      id: `${Date.now()}`,
      destination: packing.destination,
      startDate: packing.startDate,
      endDate: packing.endDate,
      createdAt: new Date().toISOString(),
      packingList: packing,
    };
    persistTrips([trip, ...savedTrips].slice(0, 20));
  }, [packing, savedTrips, persistTrips]);

  /** Free tier: 1 saved trip — further saves open the paywall. */
  const handleSavePress = useCallback(() => {
    if (!isPro && savedTrips.length >= 1) {
      setPaywallOpen(true);
      return;
    }
    saveTrip();
  }, [isPro, savedTrips.length, saveTrip]);

  const deleteTrip = useCallback(
    (id: string) => {
      Alert.alert("Delete trip?", "The saved packing list will be removed.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => persistTrips(savedTrips.filter((t) => t.id !== id)),
        },
      ]);
    },
    [savedTrips, persistTrips],
  );

  const toggleChecked = useCallback((label: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const isSaved = packing
    ? savedTrips.some(
        (t) =>
          t.destination === packing.destination &&
          t.startDate === packing.startDate &&
          t.endDate === packing.endDate,
      )
    : false;

  return (
    <Screen>
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mb-4 mt-2 flex-row items-center">
          <Ionicons name="airplane" size={26} color={palette.neonPink} />
          <Text className="ml-2 text-2xl font-black text-text">Trip Packer</Text>
        </View>
        <Text className="mb-4 text-sm text-muted">
          Destination + dates in, day-by-day outfits and scents out — packed from
          your closet for the forecast.
        </Text>

        {/* Builder form */}
        <View className="mb-4 rounded-2xl border border-line bg-panel p-4">
          <TextField
            label="Destination"
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g. Austin, TX"
            autoCapitalize="words"
          />
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <TextField
                label={`Start (from ${todayKey})`}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>
            <View className="flex-1">
              <TextField
                label={`End (max ${MAX_TRIP_DAYS} days)`}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>
          </View>
          {buildError ? (
            <Text className="mb-3 text-sm font-semibold" style={{ color: palette.danger }}>
              {buildError}
            </Text>
          ) : null}
          <Button
            title={building ? "Checking the skies…" : "Build packing list"}
            onPress={() => void build()}
            disabled={building}
          />
          {building ? (
            <ActivityIndicator className="mt-3" color={palette.neonPink} />
          ) : null}
        </View>

        {/* Results */}
        {packing ? (
          <View className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lg font-black text-text">{packing.destination}</Text>
                <Text className="text-xs text-muted">
                  {prettyDate(packing.startDate)} → {prettyDate(packing.endDate)} ·{" "}
                  {packing.days.length} day{packing.days.length === 1 ? "" : "s"}
                </Text>
              </View>
              {!isSaved ? (
                <Pressable
                  onPress={handleSavePress}
                  hitSlop={8}
                  className="rounded-full border border-line bg-panel px-4 py-2"
                  accessibilityLabel="Save trip"
                >
                  <Text className="text-sm font-bold text-text">Save</Text>
                </Pressable>
              ) : (
                <Text className="text-xs font-bold" style={{ color: palette.neonPink }}>
                  Saved ✓
                </Text>
              )}
            </View>

            {(itemsQuery.data ?? []).length === 0 ? (
              <Text className="mb-3 text-sm text-muted">
                Your closet is empty — add clothes in the Closet tab and rebuild for
                outfit picks.
              </Text>
            ) : null}

            {packing.days.map((day) => (
              <View
                key={day.date}
                className="mb-3 rounded-2xl border border-line bg-panel p-4"
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-base font-black text-text">
                    {prettyDate(day.date)}
                  </Text>
                  <Text className="text-sm text-muted">
                    {bucketEmoji(day.forecast.bucket)} {day.forecast.highF}° /{" "}
                    {day.forecast.lowF}°
                    {day.forecast.rain ? " 🌧️" : ""}
                    {day.forecast.estimated ? " (est.)" : ""}
                  </Text>
                </View>
                {SLOT_ORDER.map((slot) => {
                  const item = day.outfit.slots[slot];
                  return (
                    <View key={slot} className="flex-row items-center py-1">
                      <Text className="w-24 text-xs font-semibold uppercase tracking-widest text-muted">
                        {SLOT_LABELS[slot]}
                      </Text>
                      <Text className="flex-1 text-sm text-text" numberOfLines={1}>
                        {item ? item.name : "—"}
                      </Text>
                    </View>
                  );
                })}
                {day.scent ? (
                  <Pressable
                    onPress={() => router.push("/(tabs)/oils")}
                    className="mt-2 flex-row items-center rounded-xl border border-line bg-panel-raised px-3 py-2"
                  >
                    <Ionicons name="leaf-outline" size={16} color={palette.neonPink} />
                    <View className="ml-2 flex-1">
                      <Text className="text-sm font-bold text-text">
                        Scent: {day.scent.oil.name}
                      </Text>
                      <Text className="text-xs text-muted" numberOfLines={2}>
                        {day.scent.reason}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={palette.faint} />
                  </Pressable>
                ) : null}
              </View>
            ))}

            {/* Essentials */}
            <Text className="mb-2 mt-1 text-base font-black text-text">
              Essentials 🧳
            </Text>
            {packing.essentials.map((label) => {
              const done = checked.has(label);
              return (
                <Pressable
                  key={label}
                  onPress={() => toggleChecked(label)}
                  hitSlop={6}
                  className="mb-2 flex-row items-center rounded-xl border border-line bg-panel px-3 py-2.5"
                >
                  <Ionicons
                    name={done ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={done ? palette.neonPink : palette.muted}
                  />
                  <Text
                    className="ml-3 flex-1 text-sm text-text"
                    style={done ? { textDecorationLine: "line-through", opacity: 0.55 } : null}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}

            {/* Scents to pack — the unique bottles across the trip's days. */}
            {(() => {
              const scents = [
                ...new Set(
                  packing.days
                    .map((d) => d.scent?.oil.name)
                    .filter((n): n is string => Boolean(n)),
                ),
              ];
              if (scents.length === 0) return null;
              return (
                <View className="mt-1">
                  <Text className="mb-2 text-base font-black text-text">
                    Scents to pack 🌿
                  </Text>
                  {scents.map((name) => {
                    const key = `oil:${name}`;
                    const done = checked.has(key);
                    return (
                      <Pressable
                        key={key}
                        onPress={() => toggleChecked(key)}
                        hitSlop={6}
                        className="mb-2 flex-row items-center rounded-xl border border-line bg-panel px-3 py-2.5"
                      >
                        <Ionicons
                          name={done ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={done ? palette.neonPink : palette.muted}
                        />
                        <Text
                          className="ml-3 flex-1 text-sm text-text"
                          style={
                            done
                              ? { textDecorationLine: "line-through", opacity: 0.55 }
                              : null
                          }
                        >
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        ) : null}

        {/* Saved trips */}
        {savedTrips.length > 0 ? (
          <View className="mb-4">
            <Text className="mb-2 text-base font-black text-text">Saved trips</Text>
            {savedTrips.map((trip) => (
              <Pressable
                key={trip.id}
                onPress={() => {
                  setPacking(trip.packingList);
                  setChecked(new Set());
                  setBuildError(null);
                }}
                className="mb-2 flex-row items-center rounded-xl border border-line bg-panel px-3 py-3"
              >
                <Ionicons name="airplane-outline" size={20} color={palette.muted} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-text" numberOfLines={1}>
                    {trip.destination}
                  </Text>
                  <Text className="text-xs text-muted">
                    {prettyDate(trip.startDate)} → {prettyDate(trip.endDate)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => deleteTrip(trip.id)}
                  hitSlop={10}
                  accessibilityLabel={`Delete trip to ${trip.destination}`}
                >
                  <Ionicons name="trash-outline" size={18} color={palette.danger} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ) : !packing ? (
          <EmptyState
            icon="airplane-outline"
            title="No trips yet"
            subtitle="Plan your first getaway above — outfits packed for the destination forecast."
          />
        ) : null}
      </ScrollView>
      <Paywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        contextMessage="Free includes 1 saved trip — go Pro for unlimited saved trips."
      />
    </Screen>
  );
}
