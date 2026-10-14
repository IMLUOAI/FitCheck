import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { Favorite, FavoriteType } from "@dripcast/api";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { Button } from "../../src/components/Button";
import { TextField } from "../../src/components/TextField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { api } from "../../src/lib/api";
import { queryKeys } from "../../src/lib/queryKeys";
import { usePalette } from "../../src/store/theme";

const TYPE_OPTIONS = [
  { label: "Photo", value: "photo" },
  { label: "Video", value: "video" },
] as const;

function AddFavoriteModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const palette = usePalette();
  const queryClient = useQueryClient();
  const [type, setType] = useState<FavoriteType>("photo");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const addFavorite = useMutation({
    mutationFn: (input: { type: FavoriteType; url: string; title: string }) =>
      api.addFavorite(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
      setUrl("");
      setTitle("");
      setType("photo");
      setFormError(null);
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!/^https?:\/\//.test(url.trim())) {
      setFormError("Paste a valid link starting with http(s)://");
      return;
    }
    setFormError(null);
    addFavorite.mutate({ type, url: url.trim(), title: title.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-void px-6 pt-6">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-xl font-black text-text">Save a favorite</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={palette.muted} />
          </Pressable>
        </View>
        <Text className="mb-1.5 text-sm font-semibold uppercase tracking-widest text-muted">
          Type
        </Text>
        <View className="mb-4">
          <SegmentedControl options={[...TYPE_OPTIONS]} value={type} onChange={setType} />
        </View>
        <TextField
          label="Link"
          value={url}
          onChangeText={setUrl}
          placeholder="https://…"
          keyboardType="url"
          autoCapitalize="none"
        />
        <TextField
          label="Title (optional)"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Linen inspo"
        />
        {formError ? <Text className="mb-4 text-sm text-danger">{formError}</Text> : null}
        <Button
          title="Save favorite"
          onPress={handleSubmit}
          loading={addFavorite.isPending}
          disabled={addFavorite.isPending}
        />
      </View>
    </Modal>
  );
}

function FavoriteRow({ favorite, onDelete }: { favorite: Favorite; onDelete: () => void }) {
  const palette = usePalette();
  const open = () => {
    void Linking.openURL(favorite.url);
  };
  return (
    <Pressable
      onPress={open}
      className="mb-3 flex-row items-center rounded-2xl border border-line bg-panel p-3"
    >
      <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-panel-raised">
        <Ionicons
          name={favorite.type === "video" ? "play" : "image-outline"}
          size={22}
          color={palette.neonCyan}
        />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-text" numberOfLines={1}>
          {favorite.title || "Untitled"}
        </Text>
        <Text className="text-xs text-faint" numberOfLines={1}>
          {favorite.url}
        </Text>
      </View>
      <Pressable
        onPress={onDelete}
        hitSlop={10}
        className="ml-2 h-9 w-9 items-center justify-center"
      >
        <Ionicons name="trash-outline" size={20} color={palette.danger} />
      </Pressable>
    </Pressable>
  );
}

export default function Favorites() {
  const palette = usePalette();
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () => api.getFavorites(),
  });

  const deleteFavorite = useMutation({
    mutationFn: (id: string) => api.deleteFavorite(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Favorite[]>(queryKeys.favorites, (prev) =>
        (prev ?? []).filter((f) => f._id !== id),
      );
    },
  });

  const confirmDelete = (favorite: Favorite) => {
    Alert.alert("Delete favorite?", "This link will be removed from your saved list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteFavorite.mutate(favorite._id),
      },
    ]);
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <Text className="text-2xl font-black text-text">Saved</Text>
        <Pressable
          onPress={() => setModalOpen(true)}
          className="flex-row items-center rounded-full bg-neon-pink px-4 py-2.5"
        >
          <Ionicons name="add" size={18} color={palette.void} />
          <Text className="ml-1 text-sm font-bold text-void">Add</Text>
        </Pressable>
      </View>

      {favoritesQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.neonPink} />
        </View>
      ) : favoritesQuery.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load saved items"
          subtitle="Check your connection and try again."
          actionTitle="Retry"
          onAction={() => favoritesQuery.refetch()}
        />
      ) : (
        <FlatList
          data={favoritesQuery.data}
          keyExtractor={(f) => f._id}
          renderItem={({ item }) => (
            <FavoriteRow favorite={item} onDelete={() => confirmDelete(item)} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-outline"
              title="Nothing saved yet"
              subtitle="Stash outfit inspo, photo references, and video links here for later."
              actionTitle="Save your first link"
              onAction={() => setModalOpen(true)}
            />
          }
        />
      )}

      <AddFavoriteModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </Screen>
  );
}
