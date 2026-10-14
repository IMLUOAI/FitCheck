import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { EmptyState } from "../../src/components/EmptyState";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { BattleCard } from "../../src/components/BattleCard";
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
  isBackendMissing,
} from "../../src/hooks/useSocial";
import { useAuthStore } from "../../src/store/auth";
import { useIsPro } from "../../src/store/useSubscription";
import { usePalette } from "../../src/store/theme";
import { fitDisplayItems } from "@dripcast/api";
import type { Fit } from "@dripcast/api";
import { queryKeys } from "../../src/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

type BattleStatus = "open" | "closed";

function NewBattleModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const palette = usePalette();
  const userId = useAuthStore((s) => s.user?._id);
  const myFits = useFits(userId);
  const createBattle = useCreateBattle();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        ) : myFits.data.length < 2 ? (
          <Text className="text-sm text-muted">
            You need at least two saved fits to start a battle. Save outfits from Today's Fit first.
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
        <Button
          title={createBattle.isPending ? "Starting…" : `Battle! (${selected.length}/2)`}
          onPress={handleCreate}
          disabled={selected.length !== 2 || createBattle.isPending}
          loading={createBattle.isPending}
        />
      </View>
    </Modal>
  );
}

export default function Battles() {
  const palette = usePalette();
  const user = useAuthStore((s) => s.user);
  const isPro = useIsPro();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<BattleStatus>("open");
  const [modalOpen, setModalOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const battles = useBattles({ status });

  const onRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.battles(status) });
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

  return (
    <Screen>
      <FlatList
        data={battles.data ?? []}
        keyExtractor={(b) => b._id}
        renderItem={({ item }) => <BattleCard battle={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={battles.isFetching} onRefresh={onRefresh} tintColor={palette.neonPink} />
        }
        ListHeaderComponent={
          <View className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-2xl font-black tracking-tight text-text">
                Fit <Text className="text-neon-pink">Battles</Text>
              </Text>
              {user ? (
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
            <SegmentedControl<BattleStatus>
              options={[
                { label: "Open", value: "open" },
                { label: "Closed", value: "closed" },
              ]}
              value={status}
              onChange={setStatus}
            />
          </View>
        }
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
              title={status === "open" ? "No open battles" : "No closed battles yet"}
              subtitle={
                status === "open"
                  ? "Be the first — pit two of your fits against each other."
                  : "Finished battles will land here."
              }
              actionTitle={status === "open" && user ? "Start a battle" : undefined}
              onAction={status === "open" && user ? openNewBattle : undefined}
            />
          )
        }
      />
      <NewBattleModal visible={modalOpen} onClose={() => setModalOpen(false)} />
      <Paywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        contextMessage={`Free plan includes ${FREE_BATTLES_PER_DAY} battle per day — go Pro for unlimited battles.`}
      />
    </Screen>
  );
}
