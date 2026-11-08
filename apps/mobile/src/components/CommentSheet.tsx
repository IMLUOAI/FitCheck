import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Comment } from "@dripcast/api";
import { commentAuthorId, commentAuthorProfile } from "@dripcast/api";
import { usePalette } from "../store/theme";
import { useAuthStore } from "../store/auth";
import { useAddComment, useComments, useDeleteComment, isBackendMissing } from "../hooks/useSocial";
import { timeAgo } from "../lib/timeAgo";

function CommentRow({
  comment,
  canDelete,
  onDelete,
}: {
  comment: Comment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const palette = usePalette();
  const profile = commentAuthorProfile(comment);
  const name = profile?.name ?? "Someone";
  const avatar = profile?.avatar;
  return (
    <View className="mb-4 flex-row">
      {avatar ? (
        <Image source={{ uri: avatar }} className="h-8 w-8 rounded-full" />
      ) : (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-panel-raised">
          <Text className="text-sm font-bold text-neon-pink">{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View className="ml-2.5 flex-1">
        <View className="flex-row items-baseline" style={{ gap: 6 }}>
          <Text className="text-sm font-bold text-text">{name}</Text>
          <Text className="text-xs text-faint">{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text className="mt-0.5 text-sm text-text">{comment.text}</Text>
      </View>
      {canDelete ? (
        <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel="Delete comment">
          <Ionicons name="trash-outline" size={16} color={palette.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: "fit" | "post" | "gallery";
  targetId: string;
  /** Owner of the fit/post/album photo — they can delete any comment on it. */
  targetOwnerId?: string;
  title?: string;
}

/** Bottom sheet for reading and posting comments on a fit, shelf post, or album photo. */
export function CommentSheet({
  visible,
  onClose,
  targetType,
  targetId,
  targetOwnerId,
  title = "Comments",
}: CommentSheetProps) {
  const palette = usePalette();
  const myId = useAuthStore((s) => s.user?._id);
  const comments = useComments(targetType, targetId, visible);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || addComment.isPending) return;
    setError(null);
    addComment.mutate(
      { targetType, targetId, text: trimmed },
      {
        onSuccess: () => setText(""),
        onError: (err) =>
          setError(
            isBackendMissing(err)
              ? "Comments need the server update — coming soon."
              : "Couldn't post that comment. Try again.",
          ),
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-void px-5 pt-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-black text-text">{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close comments">
            <Ionicons name="close" size={26} color={palette.muted} />
          </Pressable>
        </View>

        {comments.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color={palette.neonPink} />
          </View>
        ) : comments.isError ? (
          <Text className="py-8 text-center text-sm text-muted">
            {isBackendMissing(comments.error)
              ? "Comments need the server update — coming soon."
              : "Couldn't load comments. Close and try again."}
          </Text>
        ) : (comments.data ?? []).length === 0 ? (
          <Text className="py-8 text-center text-sm text-muted">
            No comments yet — say something kind.
          </Text>
        ) : (
          <FlatList
            data={comments.data}
            keyExtractor={(c) => c._id}
            renderItem={({ item }) => (
              <CommentRow
                comment={item}
                canDelete={myId !== undefined && (commentAuthorId(item) === myId || targetOwnerId === myId)}
                onDelete={() => deleteComment.mutate({ id: item._id, targetType, targetId })}
              />
            )}
            contentContainerStyle={{ paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {error ? <Text className="mb-2 text-sm text-danger">{error}</Text> : null}

        <View className="flex-row items-center pb-6" style={{ gap: 8 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment…"
            placeholderTextColor={palette.faint}
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={send}
            className="flex-1 rounded-full border border-line bg-panel px-4 py-2.5 text-sm text-text"
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || addComment.isPending}
            hitSlop={8}
            accessibilityLabel="Send comment"
            className="h-10 w-10 items-center justify-center rounded-full bg-neon-pink"
            style={{ opacity: !text.trim() || addComment.isPending ? 0.5 : 1 }}
          >
            <Ionicons name="send" size={18} color={palette.void} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
