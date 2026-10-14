import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { GalleryItem, GalleryKind } from "@dripcast/api";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { Button } from "../../src/components/Button";
import { TextField } from "../../src/components/TextField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { api } from "../../src/lib/api";
import { queryKeys } from "../../src/lib/queryKeys";
import { usePalette } from "../../src/store/theme";

const TILE_GAP = 8;
const TILE_SIZE = (Dimensions.get("window").width - 32 - TILE_GAP * 2) / 3;

function guessMimeType(uri: string, fallback: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  return fallback;
}

function fileNameFor(uri: string): string {
  const last = uri.split("/").pop();
  return last && last.length > 0 ? last : `upload-${Date.now()}`;
}

function AddLinkModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const palette = usePalette();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<GalleryKind>("photo");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const addLink = useMutation({
    mutationFn: (input: { kind: GalleryKind; url: string; title: string }) =>
      api.addGalleryLink(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gallery });
      setUrl("");
      setTitle("");
      setKind("photo");
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
    addLink.mutate({ kind, url: url.trim(), title: title.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-void px-6 pt-6">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-xl font-black text-text">Add by link</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={palette.muted} />
          </Pressable>
        </View>
        <Text className="mb-1.5 text-sm font-semibold uppercase tracking-widest text-muted">
          Type
        </Text>
        <View className="mb-4">
          <SegmentedControl
            options={[
              { label: "Photo", value: "photo" },
              { label: "Video", value: "video" },
            ]}
            value={kind}
            onChange={setKind}
          />
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
          placeholder="e.g. Fit check 10/14"
        />
        {formError ? <Text className="mb-4 text-sm text-danger">{formError}</Text> : null}
        <Button
          title="Save link"
          onPress={handleSubmit}
          loading={addLink.isPending}
          disabled={addLink.isPending}
        />
      </View>
    </Modal>
  );
}

function ViewerModal({
  item,
  onClose,
  onDelete,
}: {
  item: GalleryItem | null;
  onClose: () => void;
  onDelete: (item: GalleryItem) => void;
}) {
  const palette = usePalette();
  return (
    <Modal visible={item !== null} animationType="fade" transparent>
      <View className="flex-1 bg-black/90 px-4 pb-10 pt-16">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="flex-1 text-base font-bold text-text" numberOfLines={1}>
            {item?.title || "Album item"}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} className="ml-4">
            <Ionicons name="close" size={28} color={palette.text} />
          </Pressable>
        </View>
        {item?.kind === "photo" ? (
          <Image
            source={{ uri: item.url }}
            className="w-full flex-1 rounded-2xl"
            resizeMode="contain"
          />
        ) : item ? (
          <View className="w-full flex-1 items-center justify-center rounded-2xl bg-panel">
            <Ionicons name="play-circle-outline" size={72} color={palette.neonCyan} />
            <Text className="mt-4 px-8 text-center text-sm text-muted">
              Videos play in your system player.
            </Text>
            <View className="mt-6 w-48">
              <Button
                title="Play video"
                variant="secondary"
                onPress={() => void Linking.openURL(item.url)}
              />
            </View>
          </View>
        ) : null}
        {item ? (
          <View className="mt-6">
            <Button
              title="Delete from album"
              variant="danger"
              onPress={() => onDelete(item)}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

export default function Album() {
  const palette = usePalette();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<GalleryItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const galleryQuery = useQuery({
    queryKey: queryKeys.gallery,
    queryFn: () => api.getGallery(),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.deleteGalleryItem(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<GalleryItem[]>(queryKeys.gallery, (prev) =>
        (prev ?? []).filter((g) => g._id !== id),
      );
      setViewerItem(null);
    },
  });

  const confirmDelete = (item: GalleryItem) => {
    Alert.alert("Delete from album?", "This item will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteItem.mutate(item._id),
      },
    ]);
  };

  const handleUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo access needed",
        "Allow photo library access in Settings to upload fit pics.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (!asset) return;
    setUploading(true);
    try {
      await api.uploadGalleryFile(
        {
          uri: asset.uri,
          name: asset.fileName ?? fileNameFor(asset.uri),
          mimeType: asset.mimeType ?? guessMimeType(asset.uri, "application/octet-stream"),
        },
        asset.fileName ?? undefined,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.gallery });
    } catch {
      Alert.alert("Upload failed", "The file couldn't be uploaded. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const renderTile = ({ item }: { item: GalleryItem }) => (
    <Pressable onPress={() => setViewerItem(item)} style={{ width: TILE_SIZE, height: TILE_SIZE }}>
      {item.kind === "photo" ? (
        <Image
          source={{ uri: item.url }}
          style={{ width: TILE_SIZE, height: TILE_SIZE, borderRadius: 12 }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="items-center justify-center border border-line bg-panel"
          style={{ width: TILE_SIZE, height: TILE_SIZE, borderRadius: 12 }}
        >
          <Ionicons name="play" size={28} color={palette.neonCyan} />
          <Text className="mt-1 px-1 text-center text-xs text-faint" numberOfLines={1}>
            {item.title || "Video"}
          </Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <Text className="text-2xl font-black text-text">Album</Text>
        <View className="flex-row">
          <Pressable
            onPress={() => setLinkModalOpen(true)}
            className="mr-2 flex-row items-center rounded-full border border-line bg-panel-raised px-4 py-2.5"
          >
            <Ionicons name="link-outline" size={16} color={palette.neonCyan} />
            <Text className="ml-1 text-sm font-bold text-text">Link</Text>
          </Pressable>
          <Pressable
            onPress={() => void handleUpload()}
            disabled={uploading}
            className="flex-row items-center rounded-full bg-neon-pink px-4 py-2.5"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={palette.void} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={16} color={palette.void} />
            )}
            <Text className="ml-1 text-sm font-bold text-void">Upload</Text>
          </Pressable>
        </View>
      </View>

      {galleryQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.neonPink} />
        </View>
      ) : galleryQuery.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your album"
          subtitle="Check your connection and try again."
          actionTitle="Retry"
          onAction={() => galleryQuery.refetch()}
        />
      ) : (
        <FlatList
          data={galleryQuery.data}
          keyExtractor={(g) => g._id}
          renderItem={renderTile}
          numColumns={3}
          columnWrapperStyle={{ gap: TILE_GAP }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: TILE_GAP }}
          ListEmptyComponent={
            <EmptyState
              icon="images-outline"
              title="Your album is empty"
              subtitle="Upload fit pics straight from your phone, or save links to videos and photos around the web."
              actionTitle="Upload your first pic"
              onAction={() => void handleUpload()}
            />
          }
        />
      )}

      <AddLinkModal visible={linkModalOpen} onClose={() => setLinkModalOpen(false)} />
      <ViewerModal
        item={viewerItem}
        onClose={() => setViewerItem(null)}
        onDelete={confirmDelete}
      />
    </Screen>
  );
}
