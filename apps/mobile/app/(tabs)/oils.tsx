import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { usePalette } from "../../src/store/theme";
import { OILS, type Oil } from "../../src/lib/oils";

type Filter = "all" | "single" | "blend";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Singles", value: "single" },
  { label: "Blends", value: "blend" },
] as const;

function touchLabel(oil: Oil): string | null {
  if (oil.touch === "yes") return "Also as Touch roll-on";
  if (oil.touch === "only") return "Touch roll-on only";
  return null;
}

function OilRow({ oil, onPress }: { oil: Oil; onPress: () => void }) {
  const palette = usePalette();
  const sub =
    oil.kind === "single"
      ? oil.botanical ?? "Single oil"
      : `Blend · ${oil.ingredients ? oil.ingredients.split(",").length : 0} oils`;
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl border border-line bg-panel p-4"
    >
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-panel-raised">
        <Ionicons
          name={oil.kind === "single" ? "leaf-outline" : "flask-outline"}
          size={22}
          color={palette.neonPink}
        />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-text">{oil.name}</Text>
        <Text className="text-sm italic text-muted" numberOfLines={1}>
          {sub}
        </Text>
        <Text className="mt-0.5 text-xs text-faint" numberOfLines={1}>
          {oil.origin ?? "Blend of oils"} · {oil.size}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.faint} />
    </Pressable>
  );
}

function RootStep({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className="flex-row">
      <View className="items-center" style={{ width: 20 }}>
        <View className="h-3 w-3 rounded-full bg-neon-pink" style={{ marginTop: 5 }} />
        {last ? null : <View className="w-px flex-1 bg-line" />}
      </View>
      <View className="flex-1 pb-5 pl-2">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">
          {label}
        </Text>
        <Text className="mt-0.5 text-base text-text">{value}</Text>
      </View>
    </View>
  );
}

function OilDetail({ oil, onClose }: { oil: Oil; onClose: () => void }) {
  const palette = usePalette();
  const touch = touchLabel(oil);
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-void">
        <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 48 }}>
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="flex-1 pr-4 text-2xl font-black text-text">{oil.name}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={26} color={palette.muted} />
            </Pressable>
          </View>

          <View className="mb-6 flex-row flex-wrap gap-2">
            <View className="rounded-full bg-panel px-3 py-1.5">
              <Text className="text-xs font-bold text-text">
                {oil.kind === "single" ? "Single oil" : "Blend"}
              </Text>
            </View>
            <View className="rounded-full bg-panel px-3 py-1.5">
              <Text className="text-xs font-bold text-text">{oil.size}</Text>
            </View>
            {touch ? (
              <View className="rounded-full bg-panel px-3 py-1.5">
                <Text className="text-xs font-bold text-text">{touch}</Text>
              </View>
            ) : null}
          </View>

          {oil.kind === "single" ? (
            <>
              <Text className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
                From the root
              </Text>
              {oil.botanical ? (
                <RootStep label="Plant" value={oil.botanical} />
              ) : null}
              {oil.plantPart ? (
                <RootStep label="Plant part" value={oil.plantPart} />
              ) : null}
              {oil.extraction ? (
                <RootStep label="Extraction" value={oil.extraction} />
              ) : null}
              {oil.origin ? (
                <RootStep label="Sourced in" value={oil.origin} />
              ) : null}
              {oil.constituents ? (
                <RootStep label="Main constituents" value={oil.constituents} last />
              ) : null}
            </>
          ) : (
            <>
              <Text className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
                Inside the bottle
              </Text>
              <View className="mb-6 flex-row flex-wrap gap-2">
                {(oil.ingredients ?? "")
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean)
                  .map((part) => (
                    <View key={part} className="rounded-full bg-panel px-3 py-1.5">
                      <Text className="text-xs font-bold text-text">{part}</Text>
                    </View>
                  ))}
              </View>
            </>
          )}

          <Text className="mb-1.5 text-sm font-semibold uppercase tracking-widest text-muted">
            Aroma
          </Text>
          <Text className="mb-5 text-base leading-6 text-text">{oil.aroma}</Text>

          <Text className="mb-1.5 text-sm font-semibold uppercase tracking-widest text-muted">
            How to use
          </Text>
          <Text className="mb-6 text-base leading-6 text-text">{oil.uses}</Text>

          <Text className="text-center text-xs leading-5 text-faint">
            Source: doTERRA US product pages &amp; Product Guide, Fall/Winter 2026.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function OilsScreen() {
  const palette = usePalette();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Oil | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OILS.filter((oil) => {
      if (filter !== "all" && oil.kind !== filter) return false;
      if (!q) return true;
      const haystack = [
        oil.name,
        oil.botanical ?? "",
        oil.origin ?? "",
        oil.aroma,
        oil.constituents ?? "",
        oil.ingredients ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [filter, query]);

  return (
    <Screen>
      <View className="px-5 pt-5">
        <Text className="mb-1 text-2xl font-black text-text">Oils</Text>
        <Text className="mb-4 text-sm leading-5 text-muted">
          Every doTERRA oil, from its root to the bottle. Tap one to see where it
          comes from.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search oils, plants, places…"
          placeholderTextColor={palette.faint}
          className="mb-4 rounded-2xl border border-line bg-panel px-4 py-3 text-base text-text"
        />
        <View className="mb-4">
          <SegmentedControl
            options={[...FILTER_OPTIONS]}
            value={filter}
            onChange={setFilter}
          />
        </View>
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          {filtered.length} of {OILS.length} oils
        </Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(oil) => oil.id}
        renderItem={({ item }) => (
          <OilRow oil={item} onPress={() => setSelected(item)} />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        ListEmptyComponent={
          <EmptyState
            icon="leaf-outline"
            title="No oils match"
            subtitle="Try a different name, plant, or place."
          />
        }
      />
      {selected ? <OilDetail oil={selected} onClose={() => setSelected(null)} /> : null}
    </Screen>
  );
}
