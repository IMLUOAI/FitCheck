import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Battle, BattlePick, Fit } from "@dripcast/api";
import { battleFit, fitDisplayItems, fitOwnerProfile } from "@dripcast/api";
import { usePalette } from "../store/theme";
import { useAuthStore } from "../store/auth";
import { useVoteBattle, isBackendMissing } from "../hooks/useSocial";
import { ApiError } from "@dripcast/api";

function FitThumbs({ fit }: { fit: Fit | null }) {
  const items = fit ? fitDisplayItems(fit) : [];
  const shown = items.slice(0, 4);
  if (shown.length === 0) {
    return (
      <View className="h-28 items-center justify-center rounded-xl border border-line bg-panel-raised" style={{ borderStyle: "dashed" }}>
        <Text className="text-xs text-faint">No preview</Text>
      </View>
    );
  }
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {shown.map((item) => (
        <Image
          key={item._id}
          source={{ uri: item.imageUrl }}
          className="h-14 w-14 rounded-lg"
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

function Side({
  battle,
  side,
  voted,
  closed,
  onVote,
  voting,
}: {
  battle: Battle;
  side: BattlePick;
  voted: boolean;
  closed: boolean;
  onVote: (pick: BattlePick) => void;
  voting: boolean;
}) {
  const palette = usePalette();
  const router = useRouter();
  const fit = battleFit(battle, side);
  const profile = fit ? fitOwnerProfile(fit) : null;
  const ownerName = profile?.name ?? "Someone";
  const ownerId = profile?._id;
  const votes = side === "A" ? battle.votesA : battle.votesB;
  const disabled = voted || closed || voting;

  return (
    <Pressable
      onPress={() => onVote(side)}
      disabled={disabled}
      accessibilityLabel={`Vote for fit ${side}`}
      className={`flex-1 rounded-xl border p-2.5 ${
        disabled ? "border-line" : "border-neon-pink"
      } bg-panel-raised`}
      style={{ opacity: disabled && !voted ? 0.85 : 1 }}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View
          className="h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: `${palette.neonPink}26` }}
        >
          <Text className="text-sm font-black" style={{ color: palette.neonPink }}>
            {side}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="heart" size={14} color={palette.neonPink} />
          <Text className="text-sm font-bold text-text">{votes}</Text>
        </View>
      </View>
      <FitThumbs fit={fit} />
      {ownerId ? (
        <Pressable onPress={() => router.push(`/profile?userId=${ownerId}`)} hitSlop={6}>
          <Text className="mt-2 text-xs text-neon-pink" numberOfLines={1}>
            by {ownerName}
          </Text>
        </Pressable>
      ) : (
        <Text className="mt-2 text-xs text-muted" numberOfLines={1}>
          by {ownerName}
        </Text>
      )}
      {!disabled ? (
        <Text className="mt-1 text-xs font-bold text-neon-pink">Tap to vote</Text>
      ) : null}
    </Pressable>
  );
}

/** One battle card: fit A vs fit B with vote counts and a split bar. */
export function BattleCard({ battle }: { battle: Battle }) {
  const palette = usePalette();
  const userId = useAuthStore((s) => s.user?._id);
  const vote = useVoteBattle();
  const [error, setError] = useState<string | null>(null);

  const voted = userId ? battle.voters.includes(userId) : false;
  const closed = battle.status === "closed";
  const total = battle.votesA + battle.votesB;
  const shareA = total === 0 ? 50 : Math.round((battle.votesA / total) * 100);

  const handleVote = (pick: BattlePick) => {
    if (!userId) {
      setError("Sign in to vote.");
      return;
    }
    setError(null);
    vote.mutate(
      { id: battle._id, pick },
      {
        onError: (err) => {
          if (isBackendMissing(err)) {
            setError("Voting needs the server update — coming soon.");
          } else if (err instanceof ApiError && err.status === 400) {
            setError("That vote didn't count — the battle may be closed.");
          } else {
            setError("Couldn't record your vote. Try again.");
          }
        },
      },
    );
  };

  return (
    <View className="mb-4 rounded-2xl border border-line bg-panel p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-text">Fit battle</Text>
        <View className="flex-row items-center gap-2">
          {closed ? (
            <Text className="text-xs font-bold uppercase tracking-widest text-faint">
              Closed
            </Text>
          ) : voted ? (
            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: `${palette.neonPink}26` }}
            >
              <Text className="text-xs font-bold" style={{ color: palette.neonPink }}>
                You voted
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-row gap-2.5">
        <Side battle={battle} side="A" voted={voted} closed={closed} onVote={handleVote} voting={vote.isPending} />
        <Side battle={battle} side="B" voted={voted} closed={closed} onVote={handleVote} voting={vote.isPending} />
      </View>

      {/* Vote split bar */}
      <View className="mt-3 h-2 flex-row overflow-hidden rounded-full bg-panel-raised">
        <View style={{ width: `${shareA}%`, backgroundColor: palette.neonPink }} />
        <View style={{ width: `${100 - shareA}%`, backgroundColor: palette.line }} />
      </View>
      <Text className="mt-1.5 text-xs text-muted">
        {total === 0 ? "No votes yet — be the first." : `${battle.votesA} vs ${battle.votesB} votes`}
      </Text>

      {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
