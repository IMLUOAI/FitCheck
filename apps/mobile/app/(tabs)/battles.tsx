import { useMemo, useState, type ReactElement } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { EmptyState } from "../../src/components/EmptyState";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { BattleCard } from "../../src/components/BattleCard";
import { CommunityFitCard, CommunityPostCard } from "../../src/components/CommunityCards";
import { Paywall } from "../../src/components/Paywall";
import {
  FREE_BATTLES_PER_DAY,
  battlesCreatedToday,
  recordBattleCreated,
} from "../../src/lib/pro-limits";
import {
  useBattles,
  useCreateBattle,
  useFits,
  usePosts,
  isBackendMissing,
} from "../../src/hooks/useSocial";
import { useAuthStore } from "../../src/store/auth";
import { useIsPro } from "../../src/store/useSubscription";
import { usePalette } from "../../src/store/theme";
import { fitDisplayItems } from "@dripcast/api";
import type { Battle, Fit, Post } from "@dripcast/api";
import {
  buildLeaderboard,
  currentSeasonId,
  daysLeftInSeason,
  seasonBattles,
  seasonIdsWithBattles,
  seasonLabel,
} from "../../src/lib/seasons";
import { queryKeys } from "../../src/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

type CommunityView = "feed" | "open" | "closed" | "seasons";

function NewBattleModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const palette = usePalette();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?._id);
  const myFits = useFits(userId);
  const createBattle = useCreateBattle();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fitCount = myFits.data?.length ?? 0;
  const needsFits = !myFits.isPending && !myFits.isError && fitCount < 2;

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev,
    );
  };

  const handleCreate = () => {
    if (selected.length !== 2) return;
    setError(null);
    createBattle.mutate(
      { fitA: selected[0], fitB: selected[1] },
      {
        onSuccess: () => {
          // Count against today's free quota (Pro is unlimited).
          void recordBattleCreated();
          setSelected([]);
          onClose();
        },
        onError: (err) => {
          setError(
            isBackendMissing(err)
              ? "Battles need the server update — coming soon."
              : "Couldn't start the battle. Try again.",
          );
        },
      },
    );
  };

  const renderFit = ({ item }: { item: Fit }) => {
    const active = selected.includes(item._id);
    const thumbs = fitDisplayItems(item).slice(0, 3);
    return (
      <Pressable
        onPress={() => toggle(item._id)}
        className={`mb-2.5 flex-row items-center rounded-xl border p-2.5 ${
          active ? "border-neon-pink" : "border-line"
        } bg-panel-raised`}
      >
        <View className="flex-row gap-1.5">
          {thumbs.map((t) => (
            <Image key={t._id} source={{ uri: t.imageUrl }} className="h-12 w-12 rounded-lg" resizeMode="cover" />
          ))}
          {thumbs.length === 0 ? (
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-panel">
              <Text className="text-xs text-faint">—</Text>
            </View>
          ) : null}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold capitalize text-text">{item.weather} fit</Text>
          {item.note ? (
            <Text className="text-xs text-muted" numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
        </View>
        <View
          className="h-6 w-6 items-center justify-center rounded-full border"
          style={{
            borderColor: active ? palette.neonPink : palette.line,
            backgroundColor: active ? palette.neonPink : "transparent",
          }}
        >
          {active ? <Ionicons name="checkmark" size={14} color={palette.void} /> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-void px-5 pt-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-black text-text">New battle</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={palette.muted} />
          </Pressable>
        </View>
        <Text className="mb-4 text-sm text-muted">
          Pick two of your saved fits — the crowd votes a winner.
        </Text>

        {myFits.isPending ? (
          <ActivityIndicator color={palette.neonPink} />
        ) : myFits.isError ? (
          <Text className="text-sm text-danger">
            {isBackendMissing(myFits.error)
              ? "Saving fits needs the server update — coming soon."
              : "Couldn't load your fits. Try again."}
          </Text>
        ) : fitCount < 2 ? (
          <Text className="text-sm text-muted">
            Battles are ready — they just need two saved fits to work with. Save an outfit from
            Today's Fit (tap the bookmark), shuffle and save a second one, then come back here and
            pick both.
          </Text>
        ) : (
          <FlatList
            data={myFits.data}
            keyExtractor={(f) => f._id}
            renderItem={renderFit}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}

        {error ? <Text className="mb-2 text-sm text-danger">{error}</Text> : null}
        {needsFits ? (
          <Button
            title="Go to Today's Fit"
            onPress={() => {
              onClose();
              router.push("/(tabs)/home");
            }}
          />
        ) : (
          <Button
            title={createBattle.isPending ? "Starting…" : `Battle! (${selected.length}/2)`}
            onPress={handleCreate}
            disabled={selected.length !== 2 || createBattle.isPending}
            loading={createBattle.isPending}
          />
        )}
      </View>
    </Modal>
  );
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

/** Seasons leaderboard: monthly seasons tallied from battle votes. */
function SeasonView({ battles, loading }: { battles: Battle[]; loading: boolean }) {
  const palette = usePalette();
  const isPro = useIsPro();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [seasonId, setSeasonId] = useState<string>(() => currentSeasonId());
  const seasonIds = useMemo(() => {
    const ids = seasonIdsWithBattles(battles);
    const cur = currentSeasonId();
    return ids.includes(cur) ? ids : [cur, ...ids];
  }, [battles]);
  const inSeason = useMemo(() => seasonBattles(battles, seasonId), [battles, seasonId]);
  const board = useMemo(() => buildLeaderboard(inSeason).slice(0, 10), [inSeason]);
  const totalVotes = inSeason.reduce((s, b) => s + b.votesA + b.votesB, 0);
  const isCurrent = seasonId === currentSeasonId();

  if (loading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color={palette.neonPink} />
      </View>
    );
  }

  return (
    <View>
      {/* Season picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row" style={{ gap: 8 }}>
          {seasonIds.map((id) => {
            const active = id === seasonId;
            // Free tier: current season only — past seasons are Pro.
            const locked = id !== currentSeasonId() && !isPro;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  if (locked) {
                    setPaywallOpen(true);
                    return;
                  }
                  setSeasonId(id);
                }}
                hitSlop={6}
                className="rounded-full border border-line px-4 py-2"
                style={active ? { backgroundColor: palette.neonPink, borderColor: palette.neonPink } : { backgroundColor: palette.panel }}
                accessibilityLabel={`Season ${seasonLabel(id)}${locked ? " (Pro)" : ""}`}
              >
                <View className="flex-row items-center">
                  <Text
                    className="text-sm font-bold"
                    style={{ color: active ? palette.void : palette.text }}
                  >
                    {seasonLabel(id)}
                  </Text>
                  {locked ? (
                    <Ionicons
                      name="lock-closed"
                      size={12}
                      color={active ? palette.void : palette.muted}
                      style={{ marginLeft: 4 }}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Season card */}
      <View className="mb-4 rounded-2xl border border-line bg-panel p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-black text-text">🏆 {seasonLabel(seasonId)}</Text>
          {isCurrent ? (
            <Text className="text-xs font-bold" style={{ color: palette.neonPink }}>
              {daysLeftInSeason()} days left
            </Text>
          ) : (
            <Text className="text-xs font-bold uppercase tracking-widest text-faint">Final</Text>
          )}
        </View>
        <Text className="mt-1 text-sm text-muted">
          {inSeason.length} battle{inSeason.length === 1 ? "" : "s"} · {totalVotes} vote
          {totalVotes === 1 ? "" : "s"} cast
        </Text>
      </View>

      {/* Leaderboard */}
      {board.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="No battles this season"
          subtitle="Start a battle and climb the board."
        />
      ) : (
        board.map((entry, idx) => {
          const thumbs = entry.fit ? fitDisplayItems(entry.fit).slice(0, 3) : [];
          return (
            <View
              key={entry.fitId}
              className="mb-2 flex-row items-center rounded-2xl border border-line bg-panel p-3"
            >
              <Text className="w-10 text-center text-xl font-black text-text">
                {RANK_MEDALS[idx] ?? `#${idx + 1}`}
              </Text>
              <View className="flex-row" style={{ gap: 4 }}>
                {thumbs.map((item) => (
                  <Image
                    key={item._id}
                    source={{ uri: item.imageUrl }}
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                ))}
                {thumbs.length === 0 ? (
                  <View
                    className="items-center justify-center rounded-xl bg-panel-raised"
                    style={{ width: 44, height: 44 }}
                  >
                    <Ionicons name="shirt-outline" size={20} color={palette.muted} />
                  </View>
                ) : null}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-text" numberOfLines={1}>
                  {entry.ownerName}
                  {!isCurrent && idx === 0 ? "  🏆" : ""}
                </Text>
                <Text className="text-xs text-muted">
                  {entry.votes} vote{entry.votes === 1 ? "" : "s"} · {entry.wins} win
                  {entry.wins === 1 ? "" : "s"}
                </Text>
              </View>
            </View>
          );
        })
      )}
      <Paywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        contextMessage="The current season is free — go Pro to browse past seasons."
      />
    </View>
  );
}

type FeedEntry =
  | { kind: "fit"; id: string; createdAt: string; fit: Fit }
  | { kind: "post"; id: string; createdAt: string; post: Post };

/** The community feed: everyone's shared fits and shelf posts, newest first. */
function FeedView({ header, onRefresh }: { header: ReactElement; onRefresh: () => void }) {
  const palette = usePalette();
  const fits = useFits();
  const posts = usePosts();
  const refreshing = fits.isFetching || posts.isFetching;

  const entries = useMemo<FeedEntry[]>(() => {
    const list: FeedEntry[] = [
      ...(fits.data ?? []).map((fit) => ({
        kind: "fit" as const,
        id: `fit-${fit._id}`,
        createdAt: fit.createdAt,
        fit,
      })),
      ...(posts.data ?? []).map((post) => ({
        kind: "post" as const,
        id: `post-${post._id}`,
        createdAt: post.createdAt,
        post,
      })),
    ];
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [fits.data, posts.data]);

  const failed = fits.isError || posts.isError;
  const missing =
    (fits.isError && isBackendMissing(fits.error)) ||
    (posts.isError && isBackendMissing(posts.error));

  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) =>
        item.kind === "fit" ? <CommunityFitCard fit={item.fit} /> : <CommunityPostCard post={item.post} />
      }
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.neonPink} />
      }
      ListHeaderComponent={header}
      ListEmptyComponent={
        fits.isPending || posts.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color={palette.neonPink} />
          </View>
        ) : failed ? (
          <EmptyState
            icon="people-outline"
            title="Community is on the way"
            subtitle={
              missing
                ? "The server update isn't live yet — check back soon."
                : "Couldn't load the feed. Pull to retry."
            }
          />
        ) : (
          <EmptyState
            icon="people-outline"
            title="No shares yet"
            subtitle="Save an outfit from Today's Fit, or share a book or song from your Shelf."
          />
        )
      }
    />
  );
}

export default function Community() {
  const palette = usePalette();
  const user = useAuthStore((s) => s.user);
  const isPro = useIsPro();
  const queryClient = useQueryClient();
  const [view, setView] = useState<CommunityView>("feed");
  const [modalOpen, setModalOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const battles = useBattles(
    view === "seasons" ? { limit: 100 } : view === "feed" ? { status: "open" } : { status: view },
  );

  const onRefresh = () => {
    if (view === "feed") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.fits });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: queryKeys.battles(view === "seasons" ? undefined : view),
    });
  };

  // Free-tier gate: 1 battle/day; Pro is unlimited.
  const openNewBattle = () => {
    if (!isPro) {
      void battlesCreatedToday().then((count) => {
        if (count >= FREE_BATTLES_PER_DAY) {
          setPaywallOpen(true);
        } else {
          setModalOpen(true);
        }
      });
      return;
    }
    setModalOpen(true);
  };

  const header = (
    <View className="mb-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-black tracking-tight text-text">
          Comm<Text className="text-neon-pink">unity</Text>
        </Text>
        {user && view !== "feed" ? (
          <Pressable
            onPress={openNewBattle}
            hitSlop={10}
            className="flex-row items-center gap-1.5 rounded-full bg-neon-pink px-4 py-2.5"
          >
            <Ionicons name="add" size={18} color={palette.void} />
            <Text className="text-sm font-bold text-void">New</Text>
          </Pressable>
        ) : null}
      </View>
      <SegmentedControl<CommunityView>
        options={[
          { label: "Feed", value: "feed" },
          { label: "Open", value: "open" },
          { label: "Closed", value: "closed" },
          { label: "Seasons", value: "seasons" },
        ]}
        value={view}
        onChange={setView}
      />
    </View>
  );

  return (
    <Screen>
      {view === "feed" ? (
        <FeedView header={header} onRefresh={onRefresh} />
      ) : view === "seasons" ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={battles.isFetching} onRefresh={onRefresh} tintColor={palette.neonPink} />
          }
        >
          {header}
          <SeasonView battles={battles.data ?? []} loading={battles.isPending} />
        </ScrollView>
      ) : (
      <FlatList
        data={battles.data ?? []}
        keyExtractor={(b) => b._id}
        renderItem={({ item }) => <BattleCard battle={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={battles.isFetching} onRefresh={onRefresh} tintColor={palette.neonPink} />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          battles.isPending ? (
            <View className="items-center py-16">
              <ActivityIndicator color={palette.neonPink} />
            </View>
          ) : battles.isError ? (
            <EmptyState
              icon="trophy-outline"
              title="Battles are on the way"
              subtitle={
                isBackendMissing(battles.error)
                  ? "The server update isn't live yet — check back soon."
                  : "Couldn't load battles. Pull to retry."
              }
            />
          ) : (
            <EmptyState
              icon="trophy-outline"
              title={view === "open" ? "No open battles" : "No closed battles yet"}
              subtitle={
                view === "open"
                  ? "Be the first — pit two of your fits against each other."
                  : "Finished battles will land here."
              }
              actionTitle={view === "open" && user ? "Start a battle" : undefined}
              onAction={view === "open" && user ? openNewBattle : undefined}
            />
          )
        }
      />
      )}
      <NewBattleModal visible={modalOpen} onClose={() => setModalOpen(false)} />
      <Paywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        contextMessage={`Free plan includes ${FREE_BATTLES_PER_DAY} battle per day — go Pro for unlimited battles.`}
      />
    </Screen>
  );
}
