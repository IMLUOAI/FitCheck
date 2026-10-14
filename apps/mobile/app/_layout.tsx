import "../global.css";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/lib/queryClient";
import { useAuthStore } from "../src/store/auth";
import { usePalette, useThemeStore } from "../src/store/theme";
import { useSubscriptionStore } from "../src/store/useSubscription";
import { ensureDailyNudge } from "../src/lib/notifications";

// Keep the splash screen up until auth bootstrap finishes.
void SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?._id);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const subInit = useSubscriptionStore((s) => s.init);
  const subStartListeners = useSubscriptionStore((s) => s.startListeners);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Monetization layer: configure RevenueCat once auth bootstrap settles.
  // The backend user id becomes the RevenueCat app user id so the server
  // webhook can match purchase events to the right user.
  useEffect(() => {
    if (status === "bootstrapping") return;
    subStartListeners();
    if (status === "authenticated" && userId) {
      void subInit(userId);
    } else {
      void subInit();
    }
  }, [status, userId, subInit, subStartListeners]);

  useEffect(() => {
    if (status === "bootstrapping") return;
    const inAuthGroup = segments[0] === "(auth)";
    if (status === "guest" && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (status === "authenticated" && inAuthGroup) {
      router.replace("/(tabs)/home");
    }
  }, [status, segments, router]);

  useEffect(() => {
    if (status !== "bootstrapping") {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  // Retention layer: schedule the daily morning nudge once the user is
  // signed in. Guarded internally (asks permission at most once ever).
  useEffect(() => {
    if (status === "authenticated") {
      void ensureDailyNudge();
    }
  }, [status]);

  return null;
}

/**
 * Applies the active theme: the `theme-clean` class swaps every CSS-variable
 * design token for the whole tree, and the status bar + navigator background
 * follow the palette.
 */
function ThemedRoot({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const palette = usePalette();

  return (
    <View
      className={theme === "clean" ? "theme-clean flex-1" : "flex-1"}
      style={{ flex: 1, backgroundColor: palette.void }}
    >
      <StatusBar style={theme === "clean" ? "dark" : "light"} />
      {children}
    </View>
  );
}

export default function RootLayout() {
  const palette = usePalette();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemedRoot>
        <AuthGate />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.void },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemedRoot>
    </QueryClientProvider>
  );
}
