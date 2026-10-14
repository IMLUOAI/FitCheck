import { Pressable, Text, View } from "react-native";
import type { ThemeName } from "@dripcast/theme";
import { useThemeStore } from "../store/theme";

const OPTIONS: ReadonlyArray<{ label: string; value: ThemeName }> = [
  { label: "Cyber", value: "cyber" },
  { label: "Clean", value: "clean" },
];

/** Compact Cyber/Clean segmented toggle for the home header. */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="App theme"
      className="flex-row items-center rounded-full border border-line bg-panel p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === theme;
        return (
          <Pressable
            key={option.value}
            onPress={() => setTheme(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${option.label} theme`}
            className={`rounded-full px-3 py-1.5 ${
              active ? "bg-neon-pink" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                active ? "text-void" : "text-muted"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
