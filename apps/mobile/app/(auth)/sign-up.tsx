import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { Button } from "../../src/components/Button";
import { useAuthStore } from "../../src/store/auth";

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("");
  const [busy, setBusy] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const canSubmit =
    name.trim().length >= 2 && email.trim().length > 0 && password.length >= 6 && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await signUp({ name: name.trim(), email: email.trim(), password, avatar });
      router.replace("/(tabs)/home");
    } catch {
      // Error text is surfaced from the store.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-1 text-4xl font-black tracking-tight text-text">
            JOIN THE <Text className="text-neon-pink">CAST</Text>
          </Text>
          <Text className="mb-8 text-base text-muted">
            Build your digital closet and never wonder what to wear again.
          </Text>

          <TextField
            label="Name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              clearError();
            }}
            placeholder="Your name"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clearError();
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clearError();
            }}
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
          />
          <TextField
            label="Avatar URL (optional)"
            value={avatar}
            onChangeText={setAvatar}
            placeholder="https://…"
            keyboardType="url"
            autoCapitalize="none"
          />

          {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

          <Button
            title="Create account"
            onPress={handleSubmit}
            loading={busy}
            disabled={!canSubmit}
          />

          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm text-muted">Already in? </Text>
            <Link href="/(auth)/sign-in" className="text-sm font-bold text-neon-cyan">
              Sign in
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
