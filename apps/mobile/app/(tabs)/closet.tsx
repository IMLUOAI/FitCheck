import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { WEATHER_BUCKETS } from "@dripcast/api";
import type { ClothingItem, WeatherBucket } from "@dripcast/api";
import { Screen } from "../../src/components/Screen";
import { ItemCard } from "../../src/components/ItemCard";
import { EmptyState } from "../../src/components/EmptyState";
import { Button } from "../../src/components/Button";
import { TextField } from "../../src/components/TextField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { usePalette } from "../../src/store/theme";
import { api } from "../../src/lib/api";
import { fileNameFor, guessMimeType } from "../../src/lib/media";
import { queryKeys } from "../../src/lib/queryKeys";
import { useAddItem, useDeleteItem, useLikeItem } from "../../src/hooks/useItems";
import { useAuthStore } from "../../src/store/auth";

function AddItemModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const palette = usePalette();
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [weather, setWeather] = useState<WeatherBucket>("warm");
  const [formError, setFormError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const addItem = useAddItem();

  const reset = () => {
    setName("");
    setImageUrl("");
    setWeather("warm");
    setFormError(null);
    setPhotoBusy(false);
    addItem.reset();
  };

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      setFormError("Give it a name (at least 2 characters).");
      return;
    }
    if (!/^https?:\/\//.test(imageUrl.trim())) {
      setFormError("Paste a valid image URL starting with http(s)://");
      return;
    }
    setFormError(null);
    addItem.mutate(
      { name: name.trim(), imageUrl: imageUrl.trim(), weather },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  const handleTakePhoto = async () => {
    if (name.trim().length < 2) {
      setFormError("Give it a name first, so we can label the photo.");
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setFormError(
        "Camera access is off — enable it in Settings to snap garments.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (!asset) return;

    setFormError(null);
    setPhotoBusy(true);
    let uploaded = false;
    try {
      // V1 upload path: there is no dedicated item-photo endpoint, so the
      // photo goes through POST /gallery/upload (multipart, 25MB max) and the
      // returned file URL becomes the item's imageUrl. Tradeoff: the photo
      // also lands in the user's Album. A dedicated item-upload endpoint that
      // skips the gallery is the cleaner follow-up.
      const galleryItem = await api.uploadGalleryFile(
        {
          uri: asset.uri,
          name: asset.fileName ?? fileNameFor(asset.uri),
          mimeType: asset.mimeType ?? guessMimeType(asset.uri, "image/jpeg"),
        },
        name.trim(),
      );
      uploaded = true;
      await new Promise<void>((resolve, reject) => {
        addItem.mutate(
          { name: name.trim(), imageUrl: galleryItem.url, weather },
          {
            onSuccess: () => {
              reset();
              onClose();
              resolve();
            },
            onError: (err) => reject(err),
          },
        );
      });
    } catch {
      // Upload failures surface here; create failures are already covered by
      // the addItem.isError UI below ("Couldn't save that piece").
      if (!uploaded) setFormError("Couldn't upload that photo. Try again.");
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-void px-6 pt-6">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-xl font-black text-text">New garment</Text>
          <Pressable
            onPress={() => {
              reset();
              onClose();
            }}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={palette.muted} />
          </Pressable>
        </View>

        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Oversized denim jacket"
        />
        <TextField
          label="Image URL"
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://…"
          keyboardType="url"
          autoCapitalize="none"
        />
        <View className="mb-4 flex-row items-center">
          <View className="h-px flex-1 bg-line" />
          <Text className="mx-3 text-xs font-semibold uppercase tracking-widest text-faint">
            or
          </Text>
          <View className="h-px flex-1 bg-line" />
        </View>
        <Pressable
          onPress={handleTakePhoto}
          disabled={photoBusy || addItem.isPending}
          className={`mb-4 flex-row items-center justify-center rounded-xl border border-line bg-panel-raised px-5 py-3.5 ${
            photoBusy || addItem.isPending ? "opacity-50" : "opacity-100"
          }`}
        >
          {photoBusy ? (
            <ActivityIndicator color={palette.text} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={20} color={palette.text} />
              <Text className="ml-2 text-base font-bold text-text">Take photo</Text>
            </>
          )}
        </Pressable>
        {photoBusy ? (
          <Text className="mb-4 text-center text-sm text-muted">Uploading…</Text>
        ) : null}
        <Text className="mb-1.5 text-sm font-semibold uppercase tracking-widest text-muted">
          Weather
        </Text>
        <SegmentedControl
          options={WEATHER_BUCKETS.map((b) => ({ label: b, value: b }))}
          value={weather}
          onChange={setWeather}
        />

        {formError ? <Text className="mt-4 text-sm text-danger">{formError}</Text> : null}
        {addItem.isError ? (
          <Text className="mt-4 text-sm text-danger">
            Couldn't save that piece. Try again.
          </Text>
        ) : null}

        <View className="mt-6">
          <Button
            title="Add garment"
            onPress={handleSubmit}
            loading={addItem.isPending}
            disabled={addItem.isPending || photoBusy}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function Closet() {
  const palette = usePalette();
  const [modalOpen, setModalOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const likeItem = useLikeItem();
  const deleteItem = useDeleteItem();

  const itemsQuery = useQuery({
    queryKey: queryKeys.items,
    queryFn: () => api.getItems(),
  });

  const confirmDelete = (item: ClothingItem) => {
    Alert.alert("Delete garment?", `"${item.name}" will be removed from your closet.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteItem.mutate(item._id),
      },
    ]);
  };

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <ItemCard
      item={item}
      liked={user ? item.likes.includes(user._id) : false}
      likeCount={item.likes.length}
      onLike={() => likeItem.mutate(item)}
      onLongPress={() => confirmDelete(item)}
    />
  );

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <View>
          <Text className="text-2xl font-black text-text">My Closet</Text>
          {itemsQuery.data ? (
            <Text className="text-sm text-muted">
              {itemsQuery.data.length} {itemsQuery.data.length === 1 ? "piece" : "pieces"}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => setModalOpen(true)}
          className="flex-row items-center rounded-full bg-neon-pink px-4 py-2.5"
        >
          <Ionicons name="add" size={18} color={palette.void} />
          <Text className="ml-1 text-sm font-bold text-void">Add</Text>
        </Pressable>
      </View>

      {itemsQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.neonPink} />
        </View>
      ) : itemsQuery.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your closet"
          subtitle="Check your connection and try again."
          actionTitle="Retry"
          onAction={() => itemsQuery.refetch()}
        />
      ) : (
        <FlatList
          data={itemsQuery.data}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListFooterComponent={
            itemsQuery.data && itemsQuery.data.length > 0 ? (
              <Text className="mt-2 text-center text-xs text-faint">
                Long-press a garment to delete it.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="shirt-outline"
              title="Your closet is empty"
              subtitle="Add your first garment — tap Add, snap a photo or paste an image URL, and tag it hot, warm, or cold."
              actionTitle="Add a garment"
              onAction={() => setModalOpen(true)}
            />
          }
        />
      )}

      <AddItemModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </Screen>
  );
}
