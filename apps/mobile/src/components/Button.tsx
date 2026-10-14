import { ActivityIndicator, Pressable, Text } from "react-native";
import { usePalette } from "../store/theme";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-neon-pink",
  secondary: "bg-panel-raised border border-line",
  danger: "border border-danger",
  ghost: "bg-transparent",
};

const textStyles: Record<ButtonVariant, string> = {
  primary: "text-void",
  secondary: "text-text",
  danger: "text-danger",
  ghost: "text-neon-cyan",
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: ButtonProps) {
  const busy = disabled || loading;
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className={`items-center justify-center rounded-xl px-5 py-3.5 ${variantStyles[variant]} ${
        busy ? "opacity-50" : "opacity-100"
      }`}
      style={variant === "danger" ? { backgroundColor: `${palette.danger}26` } : undefined}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? palette.void : palette.text} />
      ) : (
        <Text className={`text-base font-bold ${textStyles[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
