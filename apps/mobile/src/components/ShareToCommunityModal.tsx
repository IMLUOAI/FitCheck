import { useEffect, useState } from "react";
import { Image, Modal, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ShelfPostType } from "@dripcast/api";
import { usePalette } from "../store/theme";
import { useAuthStore } from "../store/auth";
import { useCreatePost, isBackendMissing } from "../hooks/useSocial";
import { Button } from "./Button";

export type SharePostDraft = {
  shelfType: ShelfPostType;
  title: string;
  creator?: string;
  coverUrl?: string;
  url?: string;
  note?: string;
  kindLabel: string;
  emoji?: string;
};

/** Share any shelf item, saved link, or album photo to the community feed, with an optional note. */
export function ShareToCommunityModal({ post, onClose }: { post: SharePostDraft | null; onClose: () => void }) {
  const palette = usePalette();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const createPost = useCreatePost();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNote(post?.note ?? "");
    setError(null);
  }, [post]);

  const share = () => {
    if (!post) return;
    if (!user) {
      setError("Sign in to share to the community.");
      return;
    }
    setError(null);
    createPost.mutate(
      {
        shelfType: post.shelfType,
        title: post.title,
        creator: post.creator || undefined,
        coverUrl: post.coverUrl || undefined,
        url: post.url || undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          onClose();
          router.push("/(tabs)/battles");
        },
        onError: (err) =>
          setError(
            isBackendMissing(err)
              ? "Sharing needs the server update — coming soon."
              : "Couldn't share that. Try again.",
          ),
      },
    );
  };

  return (
    <Modal visible={post !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-void px-6 pt-6">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-xl font-black text-text">Share to community</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={palette.muted} />
          </Pressable>
        </View>
        {post ? (
          <>
            <View className="mb-4 flex-row items-center rounded-2xl border border-line bg-panel p-4">
              {post.coverUrl ? (
                <Image
                  source={{ uri: post.coverUrl }}
                  style={{ width: 56, height: 56, borderRadius: 8, marginRight: 12 }}
                  resizeMode="cover"
                />
              ) : post.emoji ? (
                <Text className="mr-3 text-2xl">{post.emoji}</Text>
              ) : null}
              <View className="flex-1">
                <Text className="text-base font-bold text-text">{post.title}</Text>
                {post.creator ? <Text className="text-sm text-muted">{post.creator}</Text> : null}
                <Text className="mt-1 text-xs uppercase tracking-widest text-muted">
                  {post.kindLabel}
                </Text>
              </View>
            </View>
            <Text className="mb-1.5 text-sm font-semibold uppercase tracking-widest text-muted">
              Note
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Why are you sharing this?"
              placeholderTextColor={palette.faint}
              maxLength={280}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="mb-4 rounded-2xl border border-line bg-panel p-4 text-sm text-text"
              style={{ minHeight: 84 }}
            />
            {error ? <Text className="mb-2 text-sm text-danger">{error}</Text> : null}
            <Button
              title={createPost.isPending ? "Sharing…" : "Share to community"}
              onPress={share}
              disabled={createPost.isPending}
              loading={createPost.isPending}
            />
            <Text className="mt-3 text-center text-xs text-muted">
              Everyone signed in can see it, like it and comment on it.
            </Text>
          </>
        ) : null}
      </View>
    </Modal>
  );
}
