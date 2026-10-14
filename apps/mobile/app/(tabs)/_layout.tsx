import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ColorValue } from "react-native";
import { usePalette } from "../../src/store/theme";

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => {
    // Tab bar colors are configured as hex strings; fall back defensively.
    const iconColor = typeof color === "string" ? color : "#F4F6FF";
    return <Ionicons name={name} size={size} color={iconColor} />;
  };
}

export default function TabLayout() {
  const palette = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.neonPink,
        tabBarInactiveTintColor: palette.faint,
        tabBarStyle: {
          backgroundColor: palette.panel,
          borderTopColor: palette.line,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Today", tabBarIcon: tabIcon("home") }}
      />
      <Tabs.Screen
        name="closet"
        options={{ title: "Closet", tabBarIcon: tabIcon("shirt") }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: "Saved", tabBarIcon: tabIcon("heart") }}
      />
      <Tabs.Screen
        name="album"
        options={{ title: "Album", tabBarIcon: tabIcon("images") }}
      />
      <Tabs.Screen
        name="battles"
        options={{ title: "Battles", tabBarIcon: tabIcon("trophy") }}
      />
    </Tabs>
  );
}
