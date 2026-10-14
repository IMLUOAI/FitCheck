import { Pressable, Text, View } from "react-native";

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

/** Pill-style single-select, used for weather buckets / media types. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row rounded-xl border border-line bg-panel p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-lg px-3 py-2.5 ${
              active ? "bg-neon-pink" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-sm font-bold capitalize ${
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
