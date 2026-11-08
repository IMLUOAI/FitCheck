import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ShopButton } from "./ShopButton";
import type { ClothingItem } from "@dripcast/api";
import { isWeatherBucket } from "@dripcast/api";
import { bucketColors } from "@dripcast/theme";
import { usePalette } from "../store/theme";

interface ItemCardProps {
  item: ClothingItem;
  liked: boolean;
  likeCount: number;
  onLike: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  dirty?: boolean;
}

export function ItemCard({ item, liked, likeCount, onLike, onPress, onLongPress, dirty = false }: ItemCardProps) {
  const palette = usePalette();
  const bucket = item.weather.toLowerCase();
  const badgeColor = isWeatherBucket(bucket) ? bucketColors[bucket] : palette.muted;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="mb-3 flex-1 overflow-hidden rounded-2xl border border-line bg-panel"
    >
      <View>
        <Image
          source={{ uri: item.imageUrl }}
          className="aspect-square w-full bg-panel-raised"
          resizeMode="cover"
        />
        <View
          className="absolute left-2 top-2 rounded-full px-2.5 py-1"
          style={{ backgroundColor: "rgba(5,6,15,0.75)" }}
        >
          <Text className="text-xs font-bold capitalize" style={{ color: badgeColor }}>
            {bucket}
          </Text>
        </View>
        <Pressable
          onPress={onLike}
          hitSlop={8}
          className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(5,6,15,0.75)" }}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={20}
            color={liked ? palette.neonPink : palette.text}
          />
        </Pressable>
        {dirty ? (
          <View
            className="absolute bottom-2 left-2 rounded-full px-2.5 py-1"
            style={{ backgroundColor: "rgba(5,6,15,0.75)" }}
          >
            <Text className="text-xs font-bold" style={{ color: palette.warm }}>
              dirty
            </Text>
          </View>
        ) : null}
      </View>
      <View className="px-3 py-2.5">
        <Text className="text-sm font-semibold text-text" numberOfLines={1}>
          {item.name}
        </Text>
        {item.brand ? (
          <Text className="text-xs text-muted" numberOfLines={1}>
            {item.brand}
          </Text>
        ) : null}
        <View className="mt-0.5 flex-row items-center justify-between">
          <Text className="text-xs text-faint">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </Text>
          <ShopButton itemName={item.name} size={16} />
        </View>
      </View>
    </Pressable>
  );
}
