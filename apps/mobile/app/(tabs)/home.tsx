import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { ClothingItem } from "@dripcast/api";
import { bucketColors } from "@dripcast/theme";
import { Screen } from "../../src/components/Screen";
import { HeroBanner } from "../../src/components/HeroBanner";
import { TodaysFit } from "../../src/components/TodaysFit";
import { DailyCombo } from "../../src/components/DailyCombo";
import { DailyLitCard } from "../../src/components/DailyLitCard";
import { ItemCard } from "../../src/components/ItemCard";
import { EmptyState } from "../../src/components/EmptyState";
import { Button } from "../../src/components/Button";
import { ThemeToggle } from "../../src/components/ThemeToggle";
import { StreakPill } from "../../src/components/StreakPill";
import { Paywall } from "../../src/components/Paywall";
import { useWeather, useForecast } from "../../src/hooks/useWeather";
import { buildEveningAlert } from "../../src/lib/eveningAlert";
import { buildWeatherNote } from "../../src/lib/weatherNote";
import { ensureDailyNudge } from "../../src/lib/notifications";
import { useLikeItem } from "../../src/hooks/useItems";
import { useLaundry } from "../../src/hooks/useLaundry";
import { usePersona } from "../../src/hooks/usePersona";
import { PERSONAS } from "../../src/lib/personas";
import { api } from "../../src/lib/api";
import { queryKeys } from "../../src/lib/queryKeys";
import { conditionLabel } from "../../src/lib/weather";
import { useAuthStore } from "../../src/store/auth";
import { useIsPro } from "../../src/store/useSubscription";
import { usePalette } from "../../src/store/theme";
import { UniverseHero } from "../../src/components/UniverseHero";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const weather = useWeather();
  const forecast = useForecast();
  const likeItem = useLikeItem();
  const palette = usePalette();
  const { dirtyIds, markLaundryDay } = useLaundry();
  const { personaId, setPersonaId, persona, isPending: personaPending } = usePersona();
  const [laundryNudgeHidden, setLaundryNudgeHidden] = useState(false);
  const isPro = useIsPro();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const itemsQuery = useQuery({
    queryKey: queryKeys.items,
    queryFn: () => api.getItems(),
  });

  const bucket = weather.data?.bucket;
  const picks = (itemsQuery.data ?? []).filter(
    (item) => bucket !== undefined && item.weather.toLowerCase() === bucket,
  );

  // Tonight's outlook from the 3-hour forecast — feeds the alert card and
  // enriches tomorrow's 7:30am nudge once the forecast loads.
  const eveningAlert = useMemo(
    () =>
      weather.data && forecast.data
        ? buildEveningAlert(weather.data.tempF, weather.data.condition, forecast.data)
        : null,
    [weather.data, forecast.data],
  );
  const eveningHeadline = eveningAlert?.headline ?? null;
  useEffect(() => {
    if (eveningHeadline) {
      void ensureDailyNudge(eveningHeadline);
    }
  }, [eveningHeadline]);

  const refreshing = weather.isFetching || forecast.isFetching || itemsQuery.isFetching;
  const onRefresh = () => {
    void weather.refetch();
    void forecast.refetch();
    void queryClient.invalidateQueries({ queryKey: queryKeys.items });
  };

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <ItemCard
      item={item}
      liked={user ? item.likes.includes(user._id) : false}
      likeCount={item.likes.length}
      onLike={() => likeItem.mutate(item)}
    />
  );

  return (
    <Screen>
      <FlatList
        data={picks}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.neonPink} />}
        ListHeaderComponent={
          <View className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-2xl font-black tracking-tight text-text">
                FIT<Text className="text-neon-pink">CHECK</Text>
              </Text>
              <View className="flex-row items-center gap-2">
                <StreakPill />
                <ThemeToggle />
                <Pressable
                  onPress={() => router.push("/profile")}
                  hitSlop={10}
                  className="h-10 w-10 items-center justify-center rounded-full border border-line bg-panel"
                >
                  <Ionicons name="person-outline" size={20} color={palette.text} />
                </Pressable>
              </View>
            </View>
            <UniverseHero earthSub={weather.data ? `${weather.data.tempF}°F in ${weather.data.city}` : ""} onLocked={() => setPaywallOpen(true)} />
            {weather.isPending ? (
              <View className="mb-4 items-center rounded-2xl border border-line bg-panel p-8">
                <ActivityIndicator color={palette.neonPink} />
                <Text className="mt-3 text-sm text-muted">Reading the sky…</Text>
              </View>
            ) : weather.isError || !weather.data ? (
              <View className="mb-4 rounded-2xl border border-danger bg-panel p-5">
                <Text className="mb-1 text-base font-bold text-text">
                  Can't reach the weather
                </Text>
                <Text className="mb-4 text-sm text-muted">
                  {weather.error instanceof Error
                    ? weather.error.message
                    : "Check your connection and pull to retry."}
                </Text>
                <Button title="Retry" onPress={() => weather.refetch()} variant="secondary" />
              </View>
            ) : (
              <View>
                <View className="mb-3 flex-row items-end justify-between">
                  <View>
                    <Text className="text-xs font-semibold uppercase tracking-widest text-muted">
                      {weather.data.city} · {conditionLabel(weather.data.condition)}
                    </Text>
                    <Text className="text-5xl font-black text-text">
                      {weather.data.tempF}
                      <Text className="text-2xl text-muted">°F</Text>
                    </Text>
                  </View>
                  <View
                    className="rounded-full px-3 py-1.5"
                    style={{ backgroundColor: `${bucketColors[weather.data.bucket]}22` }}
                  >
                    <Text
                      className="text-sm font-bold capitalize"
                      style={{ color: bucketColors[weather.data.bucket] }}
                    >
                      {weather.data.bucket} day
                    </Text>
                  </View>
                </View>
                <HeroBanner bucket={weather.data.bucket} />
                <Text className="mt-3 text-center text-sm italic text-muted">
                  {buildWeatherNote(weather.data.tempF, weather.data.condition)}
                </Text>
                {weather.data.usedFallbackLocation ? (
                  <View className="mt-2 flex-row items-center">
                    <Ionicons name="location-outline" size={14} color={palette.faint} />
                    <Text className="ml-1 text-xs text-faint">
                      Location unavailable — showing Plano, TX
                    </Text>
                  </View>
                ) : null}
                <View className="mt-4">
                  <DailyLitCard />
                </View>
                {eveningAlert ? (
                  <View className="mb-4 mt-4 flex-row items-center rounded-2xl border border-line bg-panel p-4">
                    <Ionicons
                      name={
                        eveningAlert.kind === "rain"
                          ? "umbrella-outline"
                          : eveningAlert.kind === "drop"
                            ? "thermometer"
                            : "sunny-outline"
                      }
                      size={24}
                      color={palette.neonCyan}
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-bold text-text">
                        {eveningAlert.headline}
                      </Text>
                      <Text className="mt-0.5 text-sm text-muted">{eveningAlert.detail}</Text>
                    </View>
                  </View>
                ) : null}
                {!laundryNudgeHidden && dirtyIds.size >= 5 ? (
                  <View
                    className="mb-4 flex-row items-center rounded-2xl border border-line p-4"
                    style={{ backgroundColor: `${palette.warm}14` }}
                  >
                    <Text className="flex-1 text-sm font-semibold text-text">
                      🧺 Laundry day? {dirtyIds.size} pieces need a wash.
                    </Text>
                    <Pressable
                      onPress={() => void markLaundryDay()}
                      hitSlop={8}
                      className="ml-2 rounded-full bg-panel-raised px-3 py-2"
                    >
                      <Text className="text-sm font-bold" style={{ color: palette.warm }}>
                        Mark done
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setLaundryNudgeHidden(true)}
                      hitSlop={8}
                      accessibilityLabel="Dismiss laundry reminder"
                      className="ml-1 h-8 w-8 items-center justify-center"
                    >
                      <Ionicons name="close" size={18} color={palette.muted} />
                    </Pressable>
                  </View>
                ) : null}
                {!personaPending ? (
                  <View className="mb-3">
                    <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
                      Vibe
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      <Pressable
                        onPress={() => void setPersonaId(null)}
                        hitSlop={6}
                        accessibilityLabel="No persona"
                        className="rounded-full px-4 py-2"
                        style={{
                          backgroundColor:
                            personaId === null ? palette.neonPink : palette.panel,
                        }}
                      >
                        <Text
                          className="text-sm font-bold"
                          style={{
                            color: personaId === null ? palette.void : palette.text,
                          }}
                        >
                          All
                        </Text>
                      </Pressable>
                      {PERSONAS.map((p, index) => {
                        const selected = personaId === p.id;
                        // Free tier: "All" + the first persona; the rest are Pro.
                        const locked = !isPro && index > 0;
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() => {
                              if (locked) {
                                setPaywallOpen(true);
                                return;
                              }
                              void setPersonaId(p.id);
                            }}
                            hitSlop={6}
                            accessibilityLabel={`${p.label} persona${locked ? " (Pro)" : ""}`}
                            className="rounded-full px-4 py-2"
                            style={{
                              backgroundColor: selected
                                ? palette.neonPink
                                : palette.panel,
                            }}
                          >
                            <View className="flex-row items-center">
                              <Text
                                className="text-sm font-bold"
                                style={{
                                  color: selected ? palette.void : palette.text,
                                }}
                              >
                                {p.emoji} {p.label}
                              </Text>
                              {locked ? (
                                <Ionicons
                                  name="lock-closed"
                                  size={12}
                                  color={selected ? palette.void : palette.muted}
                                  style={{ marginLeft: 4 }}
                                />
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
                {bucket !== undefined && picks.length > 0 ? (
                  <View className="mt-4">
                    <TodaysFit
                      items={picks}
                      bucket={bucket}
                      weather={{
                        tempF: weather.data.tempF,
                        condition: conditionLabel(weather.data.condition),
                        city: weather.data.city,
                      }}
                    />
                  </View>
                ) : null}
                {bucket !== undefined && picks.length > 0 ? (
                  <View className="mt-4">
                    <DailyCombo
                      items={picks}
                      bucket={bucket}
                      condition={conditionLabel(weather.data.condition)}
                      personaPrefs={persona?.keywords ?? null}
                      dirtyIds={dirtyIds}
                    />
                  </View>
                ) : null}
              </View>
            )}

            <View className="mb-1 mt-5 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-text">You may want to wear</Text>
              {picks.length > 0 ? (
                <Text className="text-sm text-muted">{picks.length} picks</Text>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          !itemsQuery.isPending && bucket !== undefined ? (
            <EmptyState
              icon="shirt-outline"
              title="No fits for this weather"
              subtitle={`Nothing in your closet is tagged "${bucket}" yet. Add some pieces and they'll show up here automatically.`}
              actionTitle="Open my closet"
              onAction={() => router.push("/(tabs)/closet")}
            />
          ) : undefined
        }
      />
      <Paywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        contextMessage="Free includes 1 style persona — go Pro to unlock all 5."
      />
    </Screen>
  );
}
