import { useState } from "react";
import { Alert, Image, Pressable, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Fit, Post } from "@dripcast/api";
import { fitDisplayItems, fitOwnerProfile, postOwnerProfile } from "@dripcast/api";
import { usePalette } from "../store/theme";
import { useAuthStore } from "../store/auth";
import { useDeletePost, useLikeFit, useLikePost } from "../hooks/useSocial";
import { CommentSheet } from "./CommentSheet";
import { timeAgo } from "../lib/timeAgo";

function OwnerRow({
  ownerId,
  name,
  avatar,
  subtitle,
}: {
  ownerId?: string;
  name: string;
  avatar?: string;
  subtitle: string;
}) {
  const router = useRouter();
  const content = (
    <>
      {avatar ? (
        <Image source={{ uri: avatar }} className="h-8 w-8 rounded-full" />
      ) : (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-panel-raised">
          <Text className="text-sm font-bold text-neon-pink">{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View className="ml-2.5 flex-1">
        <Text className="text-sm font-bold text-text" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-xs text-muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </>
  );
  if (!ownerId) return <View className="flex-row items-center">{content}</View>;
  return (
    <Pressable onPress={() => router.push(`/profile?userId=${ownerId}`)} className="flex-row items-center">
      {content}
    </Pressable>
  );
}

function ActionRow({
  liked,
  likeCount,
  commentCount,
  liking,
  onLike,
  onComment,
  onShare,
}: {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  liking: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}) {
  const palette = usePalette();
  return (
    <View className="mt-3 flex-row items-center" style={{ gap: 18 }}>
      <Pressable
        onPress={onLike}
        disabled={liking}
        hitSlop={8}
        className="flex-row items-center"
        style={{ gap: 6 }}
        accessibilityLabel={liked ? "Unlike" : "Like"}
      >
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={20}
          color={liked ? palette.neonPink : palette.muted}
        />
        <Text className="text-sm font-bold text-text">{likeCount}</Text>
      </Pressable>
      <Pressable
        onPress={onComment}
        hitSlop={8}
        className="flex-row items-center"
        style={{ gap: 6 }}
        accessibilityLabel="Comments"
      >
        <Ionicons name="chatbubble-outline" size={20} color={palette.muted} />
        <Text className="text-sm font-bold text-text">{commentCount}</Text>
      </Pressable>
      <Pressable
        onPress={onShare}
        hitSlop={8}
        className="flex-row items-center"
        style={{ gap: 6 }}
        accessibilityLabel="Share"
      >
        <Ionicons name="share-outline" size={20} color={palette.muted} />
        <Text className="text-sm font-bold text-text">Share</Text>
      </Pressable>
    </View>
  );
}

/** One fit in the community feed: owner, outfit, like / comment / share. */
export function CommunityFitCard({ fit }: { fit: Fit }) {
  const userId = useAuthStore((s) => s.user?._id);
  const like = useLikeFit();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const profile = fitOwnerProfile(fit);
  const ownerId = profile?._id;
  const ownerName = profile?.name ?? "Someone";
  const liked = userId ? fit.likes.includes(userId) : false;
  const thumbs = fitDisplayItems(fit).slice(0, 4);

  const share = () => {
    void Share.share({
      message: `Check out this ${fit.weather} fit on FitCheck${fit.note ? ` — "${fit.note}"` : ""}. Styled with FitCheck.`,
    });
  };

  return (
    <View className="mb-3 rounded-2xl border border-line bg-panel p-4">
      <OwnerRow
        ownerId={ownerId}
        name={ownerName}
        avatar={profile?.avatar}
        subtitle={`${fit.weather} fit · ${timeAgo(fit.createdAt)}`}
      />
      {thumbs.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap" style={{ gap: 6 }}>
          {thumbs.map((item) => (
            <Image
              key={item._id}
              source={{ uri: item.imageUrl }}
              className="h-16 w-16 rounded-lg"
              resizeMode="cover"
            />
          ))}
        </View>
      ) : null}
      {fit.note ? <Text className="mt-3 text-sm text-text">{fit.note}</Text> : null}
      <ActionRow
        liked={liked}
        likeCount={fit.likes.length}
        commentCount={fit.commentCount ?? 0}
        liking={like.isPending}
        onLike={() => like.mutate(fit)}
        onComment={() => setCommentsOpen(true)}
        onShare={share}
      />
      <CommentSheet
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        targetType="fit"
        targetId={fit._id}
        targetOwnerId={ownerId}
      />
    </View>
  );
}

function shelfKindLabel(shelfType: Post["shelfType"]): string {
  if (shelfType === "book") return "Book";
  if (shelfType === "song") return "Song";
  return "Saved";
}

/** One shared shelf item in the community feed: cover, title, like / comment / share. */
export function CommunityPostCard({ post }: { post: Post }) {
  const palette = usePalette();
  const userId = useAuthStore((s) => s.user?._id);
  const like = useLikePost();
  const remove = useDeletePost();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const profile = postOwnerProfile(post);
  const ownerId = profile?._id;
  const ownerName = profile?.name ?? "Someone";
  const liked = userId ? post.likes.includes(userId) : false;
  const isMine = userId !== undefined && userId === ownerId;
  const kindLabel = shelfKindLabel(post.shelfType);

  const share = () => {
    void Share.share({
      message: `${post.title}${post.creator ? ` by ${post.creator}` : ""} — shared on FitCheck${post.note ? `: "${post.note}"` : ""}`,
    });
  };

  const confirmDelete = () => {
    Alert.alert("Delete post?", "This removes the post and its comments.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(post._id) },
    ]);
  };

  return (
    <View className="mb-3 rounded-2xl border border-line bg-panel p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <OwnerRow
            ownerId={ownerId}
            name={ownerName}
            avatar={profile?.avatar}
            subtitle={`${kindLabel} pick · ${timeAgo(post.createdAt)}`}
          />
        </View>
        {isMine ? (
          <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete post">
            <Ionicons name="trash-outline" size={18} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>
      <View className="mt-3 flex-row">
        {post.coverUrl ? (
          <Image source={{ uri: post.coverUrl }} className="h-16 w-16 rounded-lg" resizeMode="cover" />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-lg bg-panel-raised">
            <Ionicons name="book-outline" size={24} color={palette.muted} />
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-text" numberOfLines={2}>
            {post.title}
          </Text>
          {post.creator ? (
            <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
              {post.creator}
            </Text>
          ) : null}
          <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-neon-pink">
            {kindLabel} pick
          </Text>
        </View>
      </View>
      {post.note ? <Text className="mt-3 text-sm text-text">{post.note}</Text> : null}
      <ActionRow
        liked={liked}
        likeCount={post.likes.length}
        commentCount={post.commentCount}
        liking={like.isPending}
        onLike={() => like.mutate(post)}
        onComment={() => setCommentsOpen(true)}
        onShare={share}
      />
      <CommentSheet
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        targetType="post"
        targetId={post._id}
        targetOwnerId={ownerId}
      />
    </View>
  );
}
