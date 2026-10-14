import { Text, TextInput, View } from "react-native";
import type { KeyboardTypeOptions } from "react-native";
import { usePalette } from "../store/theme";

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string | null;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  error,
}: TextFieldProps) {
  const palette = usePalette();
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-semibold uppercase tracking-widest text-muted">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.faint}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className={`rounded-xl border bg-panel px-4 py-3.5 text-base text-text ${
          error ? "border-danger" : "border-line"
        }`}
      />
      {error ? <Text className="mt-1.5 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
