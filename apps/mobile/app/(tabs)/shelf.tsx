import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Favorite, FavoriteType } from "@dripcast/api";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { Button } from "../../src/components/Button";
import { ShareToCommunityModal, type SharePostDraft } from "../../src/components/ShareToCommunityModal";
import { TextField } from "../../src/components/TextField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { api } from "../../src/lib/api";
import { queryKeys } from "../../src/lib/queryKeys";
import { usePalette } from "../../src/store/theme";
import {
  createCollectionItem,
  loadCollections,
  saveCollections,
  searchBooks,
  searchSongs,
  type CollectionCategory,
  type CollectionItem,
  type CollectionSearchResult,
} from "../../src/lib/collections";

/* ------------------------------------------------------------------ */
/* Shared: section switcher                                            */
/* ------------------------------------------------------------------ */

type Section = "collections" | "saved";

const SECTION_OPTIONS = [
  { label: "Collections", value: "collections" },
  { label: "Saved", value: "saved" },
] as const;

/* ------------------------------------------------------------------ */
/* Collections: favourite books, songs, and other things (client-only) */
/* ------------------------------------------------------------------ */

type Filter = "all" | CollectionCategory;
type SearchKind = "books" | "songs";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Books", value: "book" },
  { label: "Songs", value: "song" },
  { label: "Other", value: "other" },
] as const;

const SEARCH_OPTIONS = [
  { label: "Books", value: "books" },
  { label: "Songs", value: "songs" },
] as const;

const MANUAL_CATEGORY_OPTIONS = [
  { label: "Book", value: "book" },
  { label: "Song", value: "song" },
  { label: "Other", value: "other" },
] as const;

const CATEGORY_EMOJI: Record<CollectionCategory, string> = {
  book: "📚",
  song: "🎵",
  other: "📦",
};

const CATEGORY_LABEL: Record<CollectionCategory, string> = {
  book: "Book",
  song: "Song",
  other: "Other",
};

function CollectionsView() {
  const palette = usePalette();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [searchKind, setSearchKind] = useState<SearchKind>("books");
  const [results, setResults] = useState<CollectionSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCreator, setFormCreator] = useState("");
  const [formCategory, setFormCategory] = useState<CollectionCategory>("book");
  const [formNote, setFormNote] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [shareDraft, setShareDraft] = useState<SharePostDraft | null>(null);

  useEffect(() => {
    void loadCollections().then(setItems);
  }, []);

  const addItem = useCallback((item: CollectionItem) => {
    setItems((prev) => {
      const next = [item, ...prev];
      void saveCollections(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      void saveCollections(next);
      return next;
    });
  }, []);

  const handleSearch = useCallback(async () => {
    const term = query.trim();
    if (!term) return;
    setSearching(true);
    const found =
      searchKind === "books" ? await searchBooks(term) : await searchSongs(term);
    setResults(found);
    setSearched(true);
    setSearching(false);
  }, [query, searchKind]);

  const handleManualAdd = useCallback(() => {
    if (!formTitle.trim()) {
      setFormError("Add a title first.");
      return;
    }
    if (formLink.trim() && !/^https?:\/\//.test(formLink.trim())) {
      setFormError("Link must start with http(s)://");
      return;
    }
    setFormError(null);
    addItem(
      createCollectionItem({
        title: formTitle,
        creator: formCreator,
        category: formCategory,
        note: formNote,
        link: formLink,
      }),
    );
    setFormTitle("");
    setFormCreator("");
    setFormNote("");
    setFormLink("");
    setShowForm(false);
  }, [formTitle, formCreator, formCategory, formNote, formLink, addItem]);

  const visible =
    filter === "all" ? items : items.filter((item) => item.category === filter);

  return (
    <View className="flex-1">
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <Text className="mb-1.5 text-sm font-semibold uppercase tracking-widest text-muted">
              Search
            </Text>
            <TextField
              label="Search"
              value={query}
              onChangeText={setQuery}
              placeholder="A book, a song, an artist…"
              autoCapitalize="none"
            />
            <View className="mb-4">
              <SegmentedControl
                options={[...SEARCH_OPTIONS]}
                value={searchKind}
                onChange={setSearchKind}
              />
            </View>
            <View className="mb-5">
              <Button
                title="Search"
                onPress={handleSearch}
                loading={searching}
                disabled={!query.trim()}
              />
            </View>

            {searched ? (
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted">
                  Results
                </Text>
                {results.length === 0 ? (
                  <Text className="text-sm leading-5 text-muted">
                    No results — try another search, or add it manually below.
                  </Text>
                ) : (
                  results.map((result, index) => (
                    <View
                      key={`${result.title}-${index}`}
                      className="mb-2 flex-row items-center rounded-2xl border border-line bg-panel p-3"
                    >
                      {result.coverUrl ? (
                        <Image
                          source={{ uri: result.coverUrl }}
                          style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="mr-3 text-xl">
                          {CATEGORY_EMOJI[result.category]}
                        </Text>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-bold text-text">
                          {result.title}
                        </Text>
                        {result.creator ? (
                          <Text className="text-sm text-muted">
                            {result.creator}
                          </Text>
                        ) : null}
                      </View>
                      <Button
                        title="Add"
                        variant="secondary"
                        onPress={() =>
                          addItem(
                            createCollectionItem({
                              title: result.title,
                              creator: result.creator,
                              category: result.category,
                              link: result.link,
                              coverUrl: result.coverUrl,
                            }),
                          )
                        }
                      />
                    </View>
                  ))
                )}
              </View>
            ) : null}

            <View className="mb-5">
              <Button
                title={showForm ? "Hide manual form" : "Add manually"}
                variant="secondary"
                onPress={() => setShowForm((prev) => !prev)}
              />
            </View>
            {showForm ? (
              <View className="mb-5 rounded-2xl border border-line bg-panel p-4">
                <TextField
                  label="Title"
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="The name of the book, song or thing"
                  error={formError}
                />
                <TextField
                  label="Creator"
                  value={formCreator}
                  onChangeText={setFormCreator}
                  placeholder="Author, artist, maker…"
                />
                <View className="mb-4">
                  <SegmentedControl
                    options={[...MANUAL_CATEGORY_OPTIONS]}
                    value={formCategory}
                    onChange={setFormCategory}
                  />
                </View>
                <TextField
                  label="Note"
                  value={formNote}
                  onChangeText={setFormNote}
                  placeholder="Why you love it (optional)"
                />
                <TextField
                  label="Link (optional)"
                  value={formLink}
                  onChangeText={setFormLink}
                  placeholder="https://…"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <Button title="Add to shelf" onPress={handleManualAdd} />
              </View>
            ) : null}

            <Text className="mb-1.5 text-sm font-semibold uppercase tracking-widest text-muted">
              Filter
            </Text>
            <View className="mb-4">
              <SegmentedControl
                options={[...FILTER_OPTIONS]}
                value={filter}
                onChange={setFilter}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="book"
            title="Nothing on the shelf yet"
            subtitle="Search above for a book or a song, or add something manually."
            actionTitle="Add manually"
            onAction={() => setShowForm(true)}
          />
        }
        renderItem={({ item }) => (
          <View className="mb-2 flex-row items-center rounded-2xl border border-line bg-panel p-4">
            {item.coverUrl ? (
              <Image
                source={{ uri: item.coverUrl }}
                style={{ width: 56, height: 56, borderRadius: 8, marginRight: 12 }}
                resizeMode="cover"
              />
            ) : (
              <Text className="mr-3 text-2xl">
                {CATEGORY_EMOJI[item.category]}
              </Text>
            )}
            <Pressable
              className="flex-1"
              onPress={() => {
                if (item.link) {
                  void Linking.openURL(item.link);
                }
              }}
            >
              <Text className="text-base font-bold text-text">
                {item.title}
              </Text>
              {item.creator ? (
                <Text className="text-sm text-muted">{item.creator}</Text>
              ) : null}
              {item.note ? (
                <Text className="mt-1 text-sm leading-5 text-text">
                  {item.note}
                </Text>
              ) : null}
              <Text className="mt-1 text-xs uppercase tracking-widest text-muted">
                {CATEGORY_LABEL[item.category]} ·{" "}
                {new Date(item.addedAt).toLocaleDateString()}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setShareDraft({
                  shelfType: item.category,
                  title: item.title,
                  creator: item.creator,
                  coverUrl: item.coverUrl,
                  url: item.link,
                  note: item.note,
                  kindLabel: CATEGORY_LABEL[item.category],
                  emoji: CATEGORY_EMOJI[item.category],
                })
              }
              hitSlop={12}
              className="ml-2 justify-center"
              accessibilityLabel="Share to community"
            >
              <Ionicons name="share-outline" size={20} color={palette.muted} />
            </Pressable>
            <Pressable
              onPress={() => removeItem(item.id)}
              hitSlop={12}
              className="ml-2 justify-center"
            >
              <Ionicons name="trash-outline" size={20} color={palette.muted} />
            </Pressable>
          </View>
        )}
      />
      <ShareToCommunityModal post={shareDraft} onClose={() => setShareDraft(null)} />
    </View>
  );
}


/* ------------------------------------------------------------------ */
/* Saved: photo/video links from the backend (previously Saved tab)    */
/* ------------------------------------------------------------------ */

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

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

/** Direct photo links show inside the app; everything else opens outside it. */
function isDirectImage(favorite: Favorite): boolean {
  const path = favorite.url.split(/[?#]/)[0].toLowerCase();
  const ext = path.slice(path.lastIndexOf(".") + 1);
  return favorite.type === "photo" && IMAGE_EXTENSIONS.includes(ext);
}

/** YouTube video ID from a watch, shorts, embed, or youtu.be link. */
function youTubeId(url: string): string | null {
  const match =
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/) ??
    url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ??
    url.match(/youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Cover for a saved link when one is available: a direct photo uses itself,
 * a YouTube link uses its thumbnail. Anything else has no cover (null).
 */
function coverFor(favorite: Favorite): string | null {
  if (isDirectImage(favorite)) return favorite.url;
  const id = youTubeId(favorite.url);
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return null;
}

function FavoriteRow({
  favorite,
  expanded,
  onToggle,
  onDelete,
  onShare,
}: {
  favorite: Favorite;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const palette = usePalette();
  const cover = coverFor(favorite);
  const [coverFailed, setCoverFailed] = useState(false);
  return (
    <View className="mb-3 rounded-2xl border border-line bg-panel p-3">
      <View className="flex-row items-center">
        {cover && !coverFailed ? (
          <Pressable onPress={onToggle} className="mr-3">
            <Image
              source={{ uri: cover }}
              style={{ width: 48, height: 48, borderRadius: 12 }}
              resizeMode="cover"
              onError={() => setCoverFailed(true)}
            />
          </Pressable>
        ) : (
          <Pressable
            onPress={onToggle}
            className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-panel-raised"
          >
            <Ionicons
              name={favorite.type === "video" ? "play" : "image-outline"}
              size={22}
              color={palette.neonCyan}
            />
          </Pressable>
        )}
        <Pressable className="flex-1" onPress={onToggle}>
          <Text className="text-base font-semibold text-text" numberOfLines={1}>
            {favorite.title || "Untitled"}
          </Text>
          <Text className="text-xs text-faint" numberOfLines={1}>
            {favorite.url}
          </Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          hitSlop={10}
          className="ml-2 h-9 w-9 items-center justify-center"
          accessibilityLabel="Share to community"
        >
          <Ionicons name="share-outline" size={20} color={palette.muted} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          className="ml-2 h-9 w-9 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={20} color={palette.danger} />
        </Pressable>
      </View>
      {expanded && isDirectImage(favorite) ? (
        <Image
          source={{ uri: favorite.url }}
          style={{ width: "100%", height: 220, marginTop: 12 }}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}

function SavedMediaView() {
  const palette = usePalette();
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shareDraft, setShareDraft] = useState<SharePostDraft | null>(null);
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
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-5 pb-2">
        <Text className="text-sm font-semibold uppercase tracking-widest text-muted">
          Saved links
        </Text>
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
            <FavoriteRow
              favorite={item}
              expanded={expandedId === item._id}
              onToggle={() => {
                if (isDirectImage(item)) {
                  setExpandedId((prev) => (prev === item._id ? null : item._id));
                } else {
                  void Linking.openURL(item.url);
                }
              }}
              onDelete={() => confirmDelete(item)}
              onShare={() =>
                setShareDraft({
                  shelfType: "other",
                  title: (item.title || "Untitled").slice(0, 120),
                  coverUrl: coverFor(item) ?? undefined,
                  url: item.url,
                  kindLabel: "Saved",
                  emoji: item.type === "video" ? "🎬" : "🖼️",
                })
              }
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
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
      <ShareToCommunityModal post={shareDraft} onClose={() => setShareDraft(null)} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Shelf tab: collections + saved, one home                            */
/* ------------------------------------------------------------------ */

export default function ShelfScreen() {
  const [section, setSection] = useState<Section>("collections");
  return (
    <Screen>
      <View className="px-5 pt-5">
        <Text className="mb-1 text-2xl font-black text-text">My Shelf</Text>
        <Text className="mb-5 text-sm leading-5 text-muted">
          Books, songs and anything else you love — plus your saved links,
          all in one place.
        </Text>
        <View className="mb-4">
          <SegmentedControl
            options={[...SECTION_OPTIONS]}
            value={section}
            onChange={setSection}
          />
        </View>
      </View>
      {section === "collections" ? <CollectionsView /> : <SavedMediaView />}
    </Screen>
  );
}
