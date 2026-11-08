import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
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
import { openBrandLink, POPULAR_BRANDS } from "../../src/lib/brands";
import { fileNameFor, guessMimeType } from "../../src/lib/media";
import { queryKeys } from "../../src/lib/queryKeys";
import { useAddItem, useDeleteItem, useLikeItem } from "../../src/hooks/useItems";
import { useLaundry } from "../../src/hooks/useLaundry";
import { useAffiliateTag, useSetAffiliateTag } from "../../src/hooks/useAffiliateTag";
import { useAuthStore } from "../../src/store/auth";

/** Amazon Associates tag for "shop the look" commission. */
function AffiliateSettings() {
  const { data: savedTag } = useAffiliateTag();
  const setTag = useSetAffiliateTag();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? savedTag ?? "";
  return (
    <View className="mt-4 rounded-2xl border border-line bg-panel p-4">
      <Text className="mb-1 text-sm font-black text-text">💰 Shop the look</Text>
      <Text className="mb-3 text-xs text-muted">
        {savedTag
          ? `Earning commission with tag "${savedTag}".`
          : "Bag icons open Amazon searches. Add your Amazon Associates tag to earn commission on taps."}
      </Text>
      <TextField
        label="Amazon affiliate tag"
        value={value}
        onChangeText={setDraft}
        placeholder="e.g. silentlogos-20"
        autoCapitalize="none"
      />
      <Button
        title={setTag.isPending ? "Saving…" : "Save tag"}
        onPress={() =>
          setTag.mutate(draft?.trim() ? draft.trim() : null, {
            onSuccess: () => setDraft(null),
          })
        }
        disabled={setTag.isPending}
      />
    </View>
  );
}

function AddItemModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const palette = usePalette();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [weather, setWeather] = useState<WeatherBucket>("warm");
  const [formError, setFormError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const addItem = useAddItem();

  const reset = () => {
    setName("");
    setBrand("");
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
      {
        name: name.trim(),
        brand: brand.trim() ? brand.trim() : undefined,
        imageUrl: imageUrl.trim(),
        weather,
      },
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
          {
            name: name.trim(),
            brand: brand.trim() ? brand.trim() : undefined,
            imageUrl: galleryItem.url,
            weather,
          },
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
          label="Brand"
          value={brand}
          onChangeText={setBrand}
          placeholder="e.g. Nike (optional)"
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
  const [search, setSearch] = useState("");
  const user = useAuthStore((s) => s.user);
  const likeItem = useLikeItem();
  const deleteItem = useDeleteItem();
  const { dirtyIds, markLaundryDay } = useLaundry();

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
      dirty={dirtyIds.has(item._id)}
    />
  );

  const confirmLaundryDay = () => {
    Alert.alert("Mark laundry done?", "All worn pieces go back to fresh.", [
      { text: "Cancel", style: "cancel" },
      { text: "Mark done", onPress: () => void markLaundryDay() },
    ]);
  };

  const term = search.trim().toLowerCase();
  const visibleItems = (itemsQuery.data ?? []).filter((item) =>
    term
      ? `${item.name} ${item.brand ?? ""}`.toLowerCase().includes(term)
      : true,
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
          {dirtyIds.size > 0 ? (
            <Pressable
              onPress={confirmLaundryDay}
              hitSlop={8}
              className="mt-1 flex-row items-center"
            >
              <Ionicons name="basket-outline" size={14} color={palette.warm} />
              <Text className="ml-1 text-sm font-semibold" style={{ color: palette.warm }}>
                {dirtyIds.size} worn — needs a wash · Mark laundry done
              </Text>
            </Pressable>
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

      <View className="px-4 pb-2">
        <TextField
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search by brand or name…"
          autoCapitalize="none"
        />
        <Text className="mt-2 text-sm text-muted">
          {term
            ? `Shop “${search.trim()}” at a favorite brand:`
            : "Shop popular brands:"}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2"
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          {POPULAR_BRANDS.map((brand) => (
            <Pressable
              key={brand.name}
              onPress={() => void openBrandLink(brand, search).catch(() => {})}
              hitSlop={8}
              accessibilityLabel={`Shop ${brand.name}`}
              className="rounded-full border border-line bg-panel-raised px-3.5 py-2"
            >
              <Text className="text-sm font-bold text-text">{brand.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
          data={visibleItems}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListFooterComponent={
            <View>
              {itemsQuery.data && itemsQuery.data.length > 0 ? (
                <Text className="mt-2 text-center text-xs text-faint">
                  Long-press a garment to delete it.
                </Text>
              ) : null}
              <AffiliateSettings />
            </View>
          }
          ListEmptyComponent={
            term ? (
              <EmptyState
                icon="search-outline"
                title="No matches"
                subtitle="Try another brand or name, or shop a popular brand above."
              />
            ) : (
              <EmptyState
                icon="shirt-outline"
                title="Your closet is empty"
                subtitle="Add your first garment — tap Add, snap a photo or paste an image URL, and tag it hot, warm, or cold."
                actionTitle="Add a garment"
                onAction={() => setModalOpen(true)}
              />
            )
          }
        />
      )}

      <AddItemModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </Screen>
  );
}
