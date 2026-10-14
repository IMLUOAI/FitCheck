import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
  className?: string;
}

/** Full-screen dark wrapper with safe-area insets. */
export function Screen({ children, className = "" }: ScreenProps) {
  return (
    <SafeAreaView className={`flex-1 bg-void ${className}`}>{children}</SafeAreaView>
  );
}
