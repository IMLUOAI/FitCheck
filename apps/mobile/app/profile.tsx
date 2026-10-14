import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "../src/components/Screen";
import { Button } from "../src/components/Button";
import { TextField } from "../src/components/TextField";
import { EmptyState } from "../src/components/EmptyState";
import { useAuthStore } from "../src/store/auth";
import { getBaseUrl, api } from "../src/lib/api";
import { queryKeys } from "../src/lib/queryKeys";
import { useFits, isBackendMissing } from "../src/hooks/useSocial";
import { usePalette } from "../src/store/theme";
import { fitDisplayItems } from "@dripcast/api";
import type { Fit } from "@dripcast/api";

function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const palette = usePalette();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [name, setName] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (name.trim().length < 2) {
      setError("Name needs at least 2 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim(), avatar: avatar.trim() });
      onClose();
    } catch {
      setError("Couldn't save changes. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-void px-6 pt-6">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-xl font-black text-text">Edit profile</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={palette.muted} />
          </Pressable>
        </View>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <TextField
          label="Avatar URL"
          value={avatar}
          onChangeText={setAvatar}
          placeholder="https://…"
          keyboardType="url"
          autoCapitalize="none"
        />
        {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
        <Button title="Save changes" onPress={() => void handleSave()} loading={busy} disabled={busy} />
      </View>
    </Modal>
  );
}

export default function Profile() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const me = useAuthStore((s) => s.user);
  const viewingOther =
    typeof userId === "string" && userId.length > 0 && userId !== me?._id;
  if (viewingOther) {
    return <PublicProfileView userId={userId} />;
  }
  return <OwnProfileView />;
}

function FitGridCard({ fit }: { fit: Fit }) {
  const palette = usePalette();
  const thumbs = fitDisplayItems(fit).slice(0, 4);
  return (
    <View className="mb-3 flex-1 rounded-2xl border border-line bg-panel p-3">
      <View className="flex-row flex-wrap gap-1.5">
        {thumbs.map((t) => (
          <Image
            key={t._id}
            source={{ uri: t.imageUrl }}
            className="h-16 w-16 rounded-lg"
            resizeMode="cover"
          />
        ))}
        {thumbs.length === 0 ? (
          <View className="h-16 w-16 items-center justify-center rounded-lg bg-panel-raised">
            <Text className="text-xs text-faint">—</Text>
          </View>
        ) : null}
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-xs font-bold capitalize text-muted">{fit.weather} fit</Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="heart" size={12} color={palette.neonPink} />
          <Text className="text-xs font-bold text-text">{fit.likes.length}</Text>
        </View>
      </View>
      {fit.note ? (
        <Text className="mt-1 text-xs text-muted" numberOfLines={2}>
          {fit.note}
        </Text>
      ) : null}
    </View>
  );
}

/** Someone else's public profile: avatar, name, their public fits, share. */
function PublicProfileView({ userId }: { userId: string }) {
  const palette = usePalette();
  const router = useRouter();
  const profile = useQuery({
    queryKey: queryKeys.publicUser(userId),
    queryFn: () => api.getPublicUser(userId),
  });
  const fits = useFits(userId);
  const [shareError, setShareError] = useState<string | null>(null);

  const handleShare = async () => {
    setShareError(null);
    try {
      await Share.share({
        message: `Check out ${profile.data?.name ?? "this stylist"}'s fits on DripCast`,
      });
    } catch {
      setShareError("Couldn't open the share sheet.");
    }
  };

  if (profile.isPending) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.neonPink} />
        </View>
      </Screen>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <Screen>
        <View className="flex-1 px-6 pt-6">
          <Pressable onPress={() => router.back()} hitSlop={12} className="mb-6 self-start">
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <EmptyState
            icon="person-outline"
            title="Couldn't load this profile"
            subtitle={
              isBackendMissing(profile.error)
                ? "Public profiles need the server update — coming soon."
                : "This user may not exist. Try again later."
            }
          />
        </View>
      </Screen>
    );
  }

  const user = profile.data;
  const initial = (user.name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="mb-6 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={() => void handleShare()}
            hitSlop={10}
            accessibilityLabel="Share profile"
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-panel"
          >
            <Ionicons name="share-outline" size={20} color={palette.neonPink} />
          </Pressable>
        </View>

        <View className="mb-6 items-center rounded-2xl border border-line bg-panel p-6">
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} className="mb-3 h-20 w-20 rounded-full" resizeMode="cover" />
          ) : (
            <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-neon-pink">
              <Text className="text-3xl font-black text-void">{initial}</Text>
            </View>
          )}
          <Text className="text-xl font-bold text-text">{user.name}</Text>
          <Text className="mt-1 text-sm text-muted">
            {fits.data ? `${fits.data.length} public fit${fits.data.length === 1 ? "" : "s"}` : ""}
          </Text>
        </View>

        {shareError ? <Text className="mb-2 text-sm text-danger">{shareError}</Text> : null}

        {fits.isPending ? (
          <ActivityIndicator color={palette.neonPink} />
        ) : fits.isError ? (
          <Text className="text-center text-sm text-danger">
            {isBackendMissing(fits.error)
              ? "Public fits need the server update — coming soon."
              : "Couldn't load fits."}
          </Text>
        ) : fits.data.length === 0 ? (
          <EmptyState icon="shirt-outline" title="No public fits yet" subtitle="Their saved outfits will show up here." />
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {fits.data.map((fit) => (
              <FitGridCard key={fit._id} fit={fit} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function OwnProfileView() {
  const palette = usePalette();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [editOpen, setEditOpen] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You'll need your email and password to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  };

  const initial = (user?.name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="mb-6 flex-row items-center">
          <Pressable onPress={() => router.back()} hitSlop={12} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Text className="text-2xl font-black text-text">Profile</Text>
        </View>

        <View className="mb-6 items-center rounded-2xl border border-line bg-panel p-6">
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              className="mb-3 h-20 w-20 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-neon-pink">
              <Text className="text-3xl font-black text-void">{initial}</Text>
            </View>
          )}
          <Text className="text-xl font-bold text-text">{user?.name ?? "—"}</Text>
          <Text className="mt-1 text-sm text-muted">{user?.email ?? "—"}</Text>
          <View className="mt-4 w-full">
            <Button title="Edit profile" variant="secondary" onPress={() => setEditOpen(true)} />
          </View>
        </View>

        <View className="mb-6 rounded-2xl border border-line bg-panel p-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-faint">
            About
          </Text>
          <View className="mb-2 flex-row justify-between">
            <Text className="text-sm text-muted">App version</Text>
            <Text className="text-sm font-semibold text-text">{appVersion}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">Backend</Text>
            <Text className="max-w-[60%] text-right text-sm font-semibold text-text" numberOfLines={1}>
              {getBaseUrl().replace("https://", "")}
            </Text>
          </View>
        </View>

        <Button title="Sign out" variant="danger" onPress={confirmSignOut} />
      </ScrollView>

      <EditProfileModal visible={editOpen} onClose={() => setEditOpen(false)} />
    </Screen>
  );
}
