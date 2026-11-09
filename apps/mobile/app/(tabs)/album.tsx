import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { uploadAsync, FileSystemUploadType } from "expo-file-system/legacy";
import { ApiError, galleryOwnerId, galleryOwnerProfile } from "@dripcast/api";
import type { GalleryItem, GalleryKind } from "@dripcast/api";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { Button } from "../../src/components/Button";
import { TextField } from "../../src/components/TextField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { CommentSheet } from "../../src/components/CommentSheet";
import { ShareToCommunityModal, type SharePostDraft } from "../../src/components/ShareToCommunityModal";
import { api } from "../../src/lib/api";
import { getAuthToken, getBaseUrl } from "../../src/lib/api";
import { queryKeys } from "../../src/lib/queryKeys";
import { usePalette } from "../../src/store/theme";
import { useAuthStore } from "../../src/store/auth";
import {
  isBackendMissing,
  useLikeGalleryItem,
  usePublicGallery,
  useSetGalleryVisibility,
} from "../../src/hooks/useSocial";

const TILE_GAP = 8;
const TILE_SIZE = (Dimensions.get("window").width - 32 - TILE_GAP * 2) / 3;

type Section = "mine" | "discover";

const SECTION_OPTIONS = [
  { label: "Mine", value: "mine" },
  { label: "Discover", value: "discover" },
] as const;

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

function AlbumPhotoTile({ uri, iconColor }: { uri: string; iconColor: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View
        className="items-center justify-center border border-line bg-panel"
        style={{ width: TILE_SIZE, height: TILE_SIZE, borderRadius: 12 }}
      >
        <Ionicons name="image-outline" size={30} color={iconColor} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      onError={() => setFailed(true)}
      style={{ width: TILE_SIZE, height: TILE_SIZE, borderRadius: 12 }}
      resizeMode="cover"
    />
  );
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
    onError: (err) => {
      setFormError(
        err instanceof ApiError && err.status === 401
          ? "Your sign-in expired — sign out and back in, then try again."
          : "Couldn't save this link. Check the URL and try again."
      );
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
        <Pressable
          onPress={() =>
            void Clipboard.getStringAsync()
              .then((text) => {
                if (text && text.trim()) {
                  setUrl(text.trim());
                } else {
                  Alert.alert(
                    "Nothing to paste",
                    "Your clipboard looks empty — copy the image link first, then try again.",
                  );
                }
              })
              .catch(() => {
                Alert.alert("Paste failed", "Couldn't read the clipboard. Try again.");
              })
          }
          hitSlop={8}
          accessibilityLabel="Paste link from clipboard"
          className="mb-4 flex-row items-center justify-center rounded-xl border border-line bg-panel px-4 py-3"
        >
          <Ionicons name="clipboard-outline" size={18} color={palette.muted} />
          <Text className="ml-2 text-sm font-bold text-text">Paste from clipboard</Text>
        </Pressable>
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
  items,
  index,
  onIndexChange,
  onClose,
  footer,
}: {
  items: GalleryItem[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Action rows under the media: owner/like/comment for Discover, visibility/share/delete for Mine. */
  footer?: ReactNode;
}) {
  const palette = usePalette();
  const safeIndex =
    index === null || items.length === 0 ? null : Math.min(index, items.length - 1);
  const item = safeIndex === null ? null : items[safeIndex];
  const prevIndex = safeIndex !== null && safeIndex > 0 ? safeIndex - 1 : null;
  const nextIndex =
    safeIndex !== null && safeIndex < items.length - 1 ? safeIndex + 1 : null;
  return (
    <Modal visible={safeIndex !== null} animationType="fade" transparent>
      <View className="flex-1 bg-black/90 px-4 pb-10 pt-16">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="flex-1 text-base font-bold text-text" numberOfLines={1}>
            {item?.title || "Album item"}
          </Text>
          {safeIndex !== null ? (
            <Text className="ml-3 text-sm text-muted">
              {safeIndex + 1} / {items.length}
            </Text>
          ) : null}
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
        {footer ? <View className="mt-6">{footer}</View> : null}
        {/* Prev / next arrows — step through photos while reviewing. */}
        {prevIndex !== null ? (
          <Pressable
            onPress={() => onIndexChange(prevIndex)}
            hitSlop={16}
            accessibilityLabel="Previous photo"
            className="absolute left-4 items-center justify-center rounded-full bg-black/70"
            style={{ width: 46, height: 46, top: "50%", marginTop: -23 }}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
        ) : null}
        {nextIndex !== null ? (
          <Pressable
            onPress={() => onIndexChange(nextIndex)}
            hitSlop={16}
            accessibilityLabel="Next photo"
            className="absolute right-4 items-center justify-center rounded-full bg-black/70"
            style={{ width: 46, height: 46, top: "50%", marginTop: -23 }}
          >
            <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
          </Pressable>
        ) : null}
        {/* Floating close — always visible over the photo, clear of the header. */}
        <Pressable
          onPress={onClose}
          hitSlop={16}
          accessibilityLabel="Close viewer"
          className="absolute right-4 top-14 items-center justify-center rounded-full bg-black/70"
          style={{ width: 46, height: 46 }}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

export default function Album() {
  const palette = usePalette();
  const router = useRouter();
  const myId = useAuthStore((s) => s.user?._id);
  const [section, setSection] = useState<Section>("mine");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [commentTarget, setCommentTarget] = useState<{ id: string; ownerId: string } | null>(null);
  const [shareDraft, setShareDraft] = useState<SharePostDraft | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const galleryQuery = useQuery({
    queryKey: queryKeys.gallery,
    queryFn: () => api.getGallery(),
  });

  const publicQuery = usePublicGallery();
  const setVisibility = useSetGalleryVisibility();
  const likeGalleryItem = useLikeGalleryItem();

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.deleteGalleryItem(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<GalleryItem[]>(queryKeys.gallery, (prev) =>
        (prev ?? []).filter((g) => g._id !== id),
      );
      setViewerIndex(null);
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

  const switchSection = (next: Section) => {
    setSection(next);
    setViewerIndex(null);
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
    // The backend caps uploads at 25MB — phone videos routinely exceed it,
    // so catch it here with a clear message instead of a cryptic failure.
    const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
    if (asset.fileSize != null && asset.fileSize > MAX_UPLOAD_BYTES) {
      const mb = Math.round(asset.fileSize / (1024 * 1024));
      Alert.alert(
        "File too large",
        `This ${asset.type === "video" ? "video" : "file"} is about ${mb} MB — the limit is 25 MB. Try a shorter clip.`,
      );
      return;
    }
    setUploading(true);
    try {
      // NOTE: React Native's fetch rejects { uri, name, type } file descriptors
      // in FormData ("Unsupported FormDataPart implementation"), so uploads go
      // through expo-file-system's native multipart uploader instead.
      const token = getAuthToken();
      const uploadResult = await uploadAsync(
        `${getBaseUrl()}/gallery/upload`,
        asset.uri,
        {
          httpMethod: "POST",
          uploadType: FileSystemUploadType.MULTIPART,
          fieldName: "file",
          mimeType: asset.mimeType ?? guessMimeType(asset.uri, "application/octet-stream"),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (uploadResult.status === 401) {
        Alert.alert(
          "Sign-in expired",
          "Your sign-in expired — sign out and back in, then try again.",
        );
        return;
      }
      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        let detail: string | null = null;
        try {
          detail = (JSON.parse(uploadResult.body) as { message?: string }).message ?? null;
        } catch {
          detail = null;
        }
        Alert.alert(
          "Upload failed",
          detail ?? `Server rejected the upload (status ${uploadResult.status}).`,
        );
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.gallery });
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error && err.message
          ? err.message
          : "The file couldn't be uploaded. Try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const renderTile = ({ item, index }: { item: GalleryItem; index: number }) => (
    <Pressable onPress={() => setViewerIndex(index)} style={{ width: TILE_SIZE, height: TILE_SIZE }}>
      {item.kind === "photo" ? (
        <AlbumPhotoTile uri={item.url} iconColor={palette.muted} />
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

  const mineItems = galleryQuery.data ?? [];
  const discoverItems = publicQuery.data ?? [];
  const activeItems = section === "mine" ? mineItems : discoverItems;
  const activeItem =
    viewerIndex === null || activeItems.length === 0
      ? null
      : activeItems[Math.min(viewerIndex, activeItems.length - 1)];

  const shareAlbumItem = (item: GalleryItem) => {
    // Close the photo viewer BEFORE opening the share sheet: presenting the
    // sheet while the viewer modal is still open leaves it hidden behind
    // the viewer on iOS, so the tap looks dead. Give the viewer a beat to
    // dismiss, then open the sheet over the plain Album screen.
    const draft: SharePostDraft = {
      shelfType: "other",
      title: item.title || (item.kind === "photo" ? "Album photo" : "Album video"),
      coverUrl: item.kind === "photo" ? item.url : undefined,
      url: item.kind === "video" ? item.url : undefined,
      kindLabel: "Album",
      emoji: item.kind === "photo" ? "🖼️" : "🎬",
    };
    setViewerIndex(null);
    setTimeout(() => setShareDraft(draft), 350);
  };

  const shareOut = (item: GalleryItem) => {
    const message = item.title ? `${item.title} — ${item.url}` : item.url;
    void Share.share({ message });
  };

  const mineFooter =
    activeItem && section === "mine" ? (
      <View>
        <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3">
          <View className="flex-1 flex-row items-center pr-3">
            <Ionicons
              name={activeItem.isPublic ? "globe-outline" : "lock-closed-outline"}
              size={18}
              color={palette.muted}
            />
            <Text className="ml-2 flex-1 text-sm text-text" numberOfLines={2}>
              {activeItem.isPublic
                ? "Public — others can see, like and comment"
                : "Private — only you can see this"}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              setVisibility.mutate({ id: activeItem._id, isPublic: !activeItem.isPublic })
            }
            disabled={setVisibility.isPending}
            hitSlop={8}
            className="rounded-full bg-panel-raised px-3 py-1.5"
          >
            <Text className="text-xs font-bold text-text">
              {activeItem.isPublic ? "Make private" : "Make public"}
            </Text>
          </Pressable>
        </View>
        <View className="mb-3">
          <Button
            title="Share to community"
            variant="secondary"
            onPress={() => shareAlbumItem(activeItem)}
          />
        </View>
        <Button
          title="Delete from album"
          variant="danger"
          onPress={() => confirmDelete(activeItem)}
        />
      </View>
    ) : null;

  const discoverFooter =
    activeItem && section === "discover" ? (
      <View>
        <Pressable
          onPress={() => {
            setViewerIndex(null);
            router.push(`/profile?userId=${galleryOwnerId(activeItem)}`);
          }}
          className="mb-4 flex-row items-center"
        >
          {galleryOwnerProfile(activeItem)?.avatar ? (
            <Image
              source={{ uri: galleryOwnerProfile(activeItem)!.avatar }}
              className="h-9 w-9 rounded-full"
            />
          ) : (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-panel-raised">
              <Text className="text-sm font-bold text-neon-pink">
                {(galleryOwnerProfile(activeItem)?.name ?? "?").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="ml-2.5 text-base font-bold text-text">
            {galleryOwnerProfile(activeItem)?.name ?? "Someone"}
          </Text>
        </Pressable>
        <View className="flex-row items-center justify-around rounded-2xl border border-line bg-panel px-2 py-2">
          <Pressable
            onPress={() => likeGalleryItem.mutate(activeItem)}
            disabled={likeGalleryItem.isPending}
            hitSlop={8}
            className="flex-row items-center px-3 py-1"
            accessibilityLabel="Like this photo"
          >
            <Ionicons
              name={
                myId !== undefined && activeItem.likes.includes(myId)
                  ? "heart"
                  : "heart-outline"
              }
              size={22}
              color={palette.neonPink}
            />
            <Text className="ml-1.5 text-sm font-bold text-text">
              {activeItem.likes.length}
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              setCommentTarget({ id: activeItem._id, ownerId: galleryOwnerId(activeItem) })
            }
            hitSlop={8}
            className="flex-row items-center px-3 py-1"
            accessibilityLabel="Comment on this photo"
          >
            <Ionicons name="chatbubble-outline" size={22} color={palette.muted} />
            <Text className="ml-1.5 text-sm font-bold text-text">
              {activeItem.commentCount ?? 0}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => shareOut(activeItem)}
            hitSlop={8}
            className="flex-row items-center px-3 py-1"
            accessibilityLabel="Share this photo"
          >
            <Ionicons name="share-outline" size={22} color={palette.muted} />
          </Pressable>
        </View>
        <View className="mt-3">
          <Button
            title="Share to community"
            variant="secondary"
            onPress={() => shareAlbumItem(activeItem)}
          />
        </View>
      </View>
    ) : null;

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <Text className="text-2xl font-black text-text">Album</Text>
        {section === "mine" ? (
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
        ) : null}
      </View>
      <View className="px-4 pb-3">
        <SegmentedControl
          options={[...SECTION_OPTIONS]}
          value={section}
          onChange={switchSection}
        />
      </View>

      {section === "mine" ? (
        galleryQuery.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={palette.neonPink} />
            <Text className="mt-3 text-sm text-muted">Loading your album…</Text>
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
            data={mineItems}
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
        )
      ) : publicQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.neonPink} />
          <Text className="mt-3 text-sm text-muted">Loading Discover…</Text>
        </View>
      ) : publicQuery.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={
            isBackendMissing(publicQuery.error)
              ? "Discover needs the server update"
              : "Couldn't load Discover"
          }
          subtitle={
            isBackendMissing(publicQuery.error)
              ? "Apply the backend update and redeploy, then public album photos will show up here."
              : "Check your connection and try again."
          }
          actionTitle="Retry"
          onAction={() => publicQuery.refetch()}
        />
      ) : (
        <FlatList
          data={discoverItems}
          keyExtractor={(g) => g._id}
          renderItem={renderTile}
          numColumns={3}
          columnWrapperStyle={{ gap: TILE_GAP }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: TILE_GAP }}
          ListEmptyComponent={
            <EmptyState
              icon="images-outline"
              title="No public albums yet"
              subtitle="When someone makes an album photo public, it shows up here — like it, comment on it, or share it."
              actionTitle="Make one of yours public"
              onAction={() => switchSection("mine")}
            />
          }
        />
      )}

      <AddLinkModal visible={linkModalOpen} onClose={() => setLinkModalOpen(false)} />
      <ViewerModal
        items={activeItems}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        footer={section === "mine" ? mineFooter : discoverFooter}
      />
      {commentTarget ? (
        <CommentSheet
          visible
          onClose={() => setCommentTarget(null)}
          targetType="gallery"
          targetId={commentTarget.id}
          targetOwnerId={commentTarget.ownerId}
          title="Comments"
        />
      ) : null}
      <ShareToCommunityModal post={shareDraft} onClose={() => setShareDraft(null)} />
    </Screen>
  );
}
