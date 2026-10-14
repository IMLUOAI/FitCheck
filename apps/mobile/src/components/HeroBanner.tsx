import { Image, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import type { WeatherBucket } from "@dripcast/api";

/** Cyberpunk hero art, one per weather bucket. */
const HERO_IMAGES: Record<WeatherBucket, ImageSourcePropType> = {
  hot: require("../../assets/hero/hero-hot.jpg"),
  warm: require("../../assets/hero/hero-warm-young.jpg"),
  cold: require("../../assets/hero/hero-cold-young.jpg"),
};

const HERO_LABELS: Record<WeatherBucket, string> = {
  hot: "Cyberpunk heroine — hot weather",
  warm: "Cyberpunk heroine — warm weather",
  cold: "Cyberpunk heroine — cold weather",
};

interface HeroBannerProps {
  bucket: WeatherBucket;
}

/** Wide banner on the home screen that swaps with the current weather bucket. */
export function HeroBanner({ bucket }: HeroBannerProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-line">
      <Image
        source={HERO_IMAGES[bucket]}
        accessibilityLabel={HERO_LABELS[bucket]}
        className="h-52 w-full"
        resizeMode="cover"
      />
    </View>
  );
}
