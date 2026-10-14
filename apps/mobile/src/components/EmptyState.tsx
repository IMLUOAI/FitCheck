import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";
import { usePalette } from "../store/theme";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionTitle, onAction }: EmptyStateProps) {
  const palette = usePalette();
  return (
    <View className="items-center justify-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-panel-raised">
        <Ionicons name={icon} size={30} color={palette.neonPink} />
      </View>
      <Text className="mb-2 text-center text-lg font-bold text-text">{title}</Text>
      <Text className="mb-6 text-center text-sm leading-5 text-muted">{subtitle}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}
