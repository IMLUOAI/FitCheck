import { useState } from "react";
import { Link } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { Button } from "../../src/components/Button";
import { useAuthStore } from "../../src/store/auth";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await signIn({ email: email.trim(), password });
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
            DRIP<Text className="text-neon-pink">CAST</Text>
          </Text>
          <Text className="mb-8 text-base text-muted">
            Your closet, tuned to the sky. Sign in to get today's fit.
          </Text>

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
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

          <Button title="Sign in" onPress={handleSubmit} loading={busy} disabled={!canSubmit} />

          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm text-muted">New here? </Text>
            <Link href="/(auth)/sign-up" className="text-sm font-bold text-neon-cyan">
              Create an account
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
