import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { ClothingItem } from "@dripcast/api";
import { bucketColors } from "@dripcast/theme";
import { Screen } from "../../src/components/Screen";
import { HeroBanner } from "../../src/components/HeroBanner";
import { TodaysFit } from "../../src/components/TodaysFit";
import { ItemCard } from "../../src/components/ItemCard";
import { EmptyState } from "../../src/components/EmptyState";
import { Button } from "../../src/components/Button";
import { ThemeToggle } from "../../src/components/ThemeToggle";
import { StreakPill } from "../../src/components/StreakPill";
import { useWeather } from "../../src/hooks/useWeather";
import { useLikeItem } from "../../src/hooks/useItems";
import { api } from "../../src/lib/api";
import { queryKeys } from "../../src/lib/queryKeys";
import { conditionLabel } from "../../src/lib/weather";
import { useAuthStore } from "../../src/store/auth";
import { usePalette } from "../../src/store/theme";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const weather = useWeather();
  const likeItem = useLikeItem();
  const palette = usePalette();

  const itemsQuery = useQuery({
    queryKey: queryKeys.items,
    queryFn: () => api.getItems(),
  });

  const bucket = weather.data?.bucket;
  const picks = (itemsQuery.data ?? []).filter(
    (item) => bucket !== undefined && item.weather.toLowerCase() === bucket,
  );

  const refreshing = weather.isFetching || itemsQuery.isFetching;
  const onRefresh = () => {
    void weather.refetch();
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
                DRIP<Text className="text-neon-pink">CAST</Text>
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
                {weather.data.usedFallbackLocation ? (
                  <View className="mt-2 flex-row items-center">
                    <Ionicons name="location-outline" size={14} color={palette.faint} />
                    <Text className="ml-1 text-xs text-faint">
                      Location unavailable — showing Plano, TX
                    </Text>
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
          ) : null
        }
      />
    </Screen>
  );
}
