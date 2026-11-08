/**
 * Hero banner mode: the home-page hero shows either the weather-bucket art
 * or a rotating pick from the user's album photos.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type HeroMode = "weather" | "album";

const KEY = "dripcast.heroMode";

export async function getHeroMode(): Promise<HeroMode> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === "album" ? "album" : "weather";
}

export async function setHeroMode(mode: HeroMode): Promise<void> {
  await AsyncStorage.setItem(KEY, mode);
}
