/**
 * Shop the look (roadmap feature #7, v1): "shop similar" links for closet
 * pieces and outfit slots.
 *
 * Links point at Amazon search for the item. When the user saves their
 * Amazon Associates tag, it's appended so purchases earn commission;
 * without a tag the links still work as plain shopping searches.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";

const TAG_KEY = "dripcast.amazonTag";

export async function getAffiliateTag(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(TAG_KEY);
  const tag = raw?.trim();
  return tag ? tag : null;
}

export async function setAffiliateTag(tag: string | null): Promise<void> {
  const clean = tag?.trim();
  if (clean) await AsyncStorage.setItem(TAG_KEY, clean);
  else await AsyncStorage.removeItem(TAG_KEY);
}

/** Amazon search URL for an item, tagged when an affiliate tag is saved. */
export function shopSearchUrl(itemName: string, tag: string | null): string {
  const q = encodeURIComponent(itemName.trim());
  return `https://www.amazon.com/s?k=${q}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;
}

export async function openShopLink(itemName: string, tag: string | null): Promise<void> {
  await Linking.openURL(shopSearchUrl(itemName, tag));
}
