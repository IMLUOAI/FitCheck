import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes, type ThemeName } from "@dripcast/theme";

interface ThemeState {
  /** Active theme. Defaults to blush (warm cream-pink light). */
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "blush",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "fitcheck-theme",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * Active palette object for inline styles and icon/prop colors that can't
 * use NativeWind classes. Same token names as the CSS variables, so
 * `palette.neonPink` always matches the `bg-neon-pink` class.
 */
export function usePalette() {
  const theme = useThemeStore((s) => s.theme);
  return themes[theme];
}

export type { ThemeName };
