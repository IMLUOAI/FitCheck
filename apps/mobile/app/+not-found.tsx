import { Link } from "expo-router";
import { Text, View } from "react-native";
import { Screen } from "../src/components/Screen";

export default function NotFound() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-2 text-2xl font-black text-text">404</Text>
        <Text className="mb-6 text-center text-muted">
          This screen wandered off into the neon rain.
        </Text>
        <Link href="/(tabs)/home" className="text-base font-bold text-neon-cyan">
          Back home
        </Link>
      </View>
    </Screen>
  );
}
