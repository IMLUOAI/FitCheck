import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePalette } from "../store/theme";
import { useAffiliateTag } from "../hooks/useAffiliateTag";
import { openShopLink } from "../lib/affiliate";

/** Bag icon that opens an Amazon "shop similar" search for the item. */
export function ShopButton({ itemName, size = 18 }: { itemName: string; size?: number }) {
  const palette = usePalette();
  const { data: tag } = useAffiliateTag();
  return (
    <Pressable
      onPress={() => void openShopLink(itemName, tag ?? null).catch(() => {})}
      hitSlop={8}
      accessibilityLabel={`Shop similar: ${itemName}`}
    >
      <Ionicons name="bag-outline" size={size} color={palette.muted} />
    </Pressable>
  );
}
