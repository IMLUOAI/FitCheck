import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import type { ClothingItem } from "@dripcast/api";
import { ApiError } from "@dripcast/api";
import {
  assembleOutfit,
  conditionNote,
  SLOT_LABELS,
  type OutfitSlot,
} from "../lib/outfit";
import { FitCheckCard } from "./FitCheckCard";
import { Paywall } from "./Paywall";
import { usePalette } from "../store/theme";
import { useAuthStore } from "../store/auth";
import { useIsPro } from "../store/useSubscription";
import { useCreateFit, useFits, isBackendMissing } from "../hooks/useSocial";
import { FREE_FIT_LIMIT } from "../lib/pro-limits";

interface TodaysFitProps {
  items: ClothingItem[];
  bucket: "hot" | "warm" | "cold";
  weather: {
    tempF: number;
    condition: string;
    city: string;
  };
}

const SLOT_ORDER: OutfitSlot[] = ["tops", "bottoms", "shoes", "outerwear"];

/** Story-format export size for the fit-check card. */
const SHARE_IMAGE_WIDTH = 1080;
const SHARE_IMAGE_HEIGHT = 1350;

export function TodaysFit({ items, bucket, weather }: TodaysFitProps) {
  const router = useRouter();
  const [seed, setSeed] = useState(() => Date.now());
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const palette = usePalette();
  const cardRef = useRef<View>(null);
  const createFit = useCreateFit();
  const userId = useAuthStore((s) => s.user?._id);
  const isPro = useIsPro();
  const myFits = useFits(userId);

  if (items.length === 0) {
    return null;
  }

  const { slots } = assembleOutfit(items, seed, weather.condition);
  const note = conditionNote(weather.condition);
  const filledIds = SLOT_ORDER.map((slot) => slots[slot]).filter(
    (item): item is ClothingItem => item !== null,
  ).map((item) => item._id);

  const handleSaveFit = () => {
    if (createFit.isPending) return;
    setSaveMsg(null);
    setSaveOk(false);
    if (filledIds.length === 0) {
      setSaveMsg("Nothing to save yet.");
      return;
    }
    // Free-tier gate: signed-in free users keep 3 saved fits; Pro is unlimited.
    // Guests (no userId) skip the gate and hit the existing sign-in path.
    const fitCount = userId ? (myFits.data?.length ?? 0) : 0;
    if (!isPro && userId && fitCount >= FREE_FIT_LIMIT) {
      setPaywallOpen(true);
      return;
    }
    createFit.mutate(
      { items: filledIds, weather: bucket },
      {
        onSuccess: () => {
          setSaveOk(true);
          setSaveMsg("Saved to your fits.");
        },
        onError: (err) => {
          if (isBackendMissing(err)) {
            setSaveMsg("Saving fits needs the server update — coming soon.");
          } else if (err instanceof ApiError && err.status === 401) {
            setSaveMsg("Sign in to save fits.");
          } else {
            setSaveMsg("Couldn't save this fit. Try again.");
          }
        },
      },
    );
  };

  const handleShare = async () => {
    if (sharing) return;
    setShareError(null);
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        throw new Error("Sharing is not available on this device.");
      }
      // Warm the image cache so thumbnails are painted before capture.
      const filled = SLOT_ORDER.map((slot) => slots[slot]).filter(
        (item): item is ClothingItem => item !== null,
      );
      await Promise.all(filled.map((item) => Image.prefetch(item.imageUrl)));
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: SHARE_IMAGE_WIDTH,
        height: SHARE_IMAGE_HEIGHT,
      });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share your fit",
      });
    } catch {
      setShareError("Couldn't create the share image — try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <View className="mb-4 rounded-2xl border border-line bg-panel p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-text">Today's Fit</Text>
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
          <Pressable
            onPress={handleSaveFit}
            disabled={createFit.isPending}
            hitSlop={10}
            accessibilityLabel="Save as fit"
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-panel-raised"
          >
            {createFit.isPending ? (
              <ActivityIndicator size="small" color={palette.neonPink} />
            ) : (
              <Ionicons name="bookmark-outline" size={20} color={palette.neonPink} />
            )}
          </Pressable>
          <Pressable
            onPress={handleShare}
            disabled={sharing}
            hitSlop={10}
            accessibilityLabel="Share fit check"
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-panel-raised"
          >
            {sharing ? (
              <ActivityIndicator size="small" color={palette.neonPink} />
            ) : (
              <Ionicons name="share-outline" size={20} color={palette.neonPink} />
            )}
          </Pressable>
          <Pressable
            onPress={() => setSeed(Date.now())}
            hitSlop={10}
            accessibilityLabel="Shuffle outfit"
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-panel-raised"
          >
            <Ionicons name="shuffle" size={20} color={palette.neonPink} />
          </Pressable>
        </View>
      </View>

      {shareError ? (
        <Text className="mb-2 text-sm text-danger">{shareError}</Text>
      ) : null}
      {saveMsg ? (
        <Text
          className="mb-2 text-sm font-semibold"
          style={{ color: saveOk ? palette.neonPink : palette.danger }}
        >
          {saveMsg}
        </Text>
      ) : null}

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
          </View>
        );
      })}

      {/* Hidden off-screen render of the share card. Always mounted (laid out
          but invisible) so captureRef can snapshot it on demand. */}
      <View style={{ position: "absolute", top: -10000, left: 0 }} collapsable={false}>
        <View ref={cardRef} collapsable={false}>
          <FitCheckCard
            outfit={slots}
            bucket={bucket}
            tempF={weather.tempF}
            condition={weather.condition}
            city={weather.city}
          />
        </View>
      </View>

      <Paywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        contextMessage={`Free plan includes ${FREE_FIT_LIMIT} saved fits — go Pro to keep every outfit.`}
      />
    </View>
  );
}
