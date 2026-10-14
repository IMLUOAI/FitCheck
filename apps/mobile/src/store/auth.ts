import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { ApiError } from "@dripcast/api";
import type {
  SignInInput,
  SignUpInput,
  UpdateProfileInput,
  User,
} from "@dripcast/api";
import { api, setAuthToken } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { queryKeys } from "../lib/queryKeys";

const TOKEN_KEY = "dripcast.jwt";

/** Fallback avatar when the user skips the avatar URL at signup (backend requires one). */
function defaultAvatar(name: string): string {
  return `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(name.trim() || "D")}`;
}

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    try {
      const parsed = JSON.parse(err.body) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // fall through to generic message
    }
    if (err.status === 401) return "Incorrect email or password.";
    if (err.status === 409) return "An account with this email already exists.";
    return `Something went wrong (${err.status}).`;
  }
  return "Network error. Check your connection and try again.";
}

export type AuthStatus = "bootstrapping" | "guest" | "authenticated";

interface AuthState {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  clearError: () => void;
}

async function persistToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
  setAuthToken(token);
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "bootstrapping",
  token: null,
  user: null,
  error: null,

  bootstrap: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        set({ status: "guest", token: null, user: null });
        return;
      }
      setAuthToken(token);
      const user = await api.getMe();
      set({ status: "authenticated", token, user, error: null });
    } catch {
      await persistToken(null);
      set({ status: "guest", token: null, user: null });
    }
  },

  signIn: async (input) => {
    set({ error: null });
    try {
      const { token } = await api.signIn(input);
      await persistToken(token);
      const user = await api.getMe();
      set({ status: "authenticated", token, user });
    } catch (err) {
      await persistToken(null);
      set({ status: "guest", error: friendlyError(err) });
      throw err;
    }
  },

  signUp: async (input) => {
    set({ error: null });
    try {
      const payload: SignUpInput = {
        ...input,
        avatar: input.avatar.trim() ? input.avatar.trim() : defaultAvatar(input.name),
      };
      await api.signUp(payload);
      // Backend issues the token only via /signin — chain straight into it.
      const { token } = await api.signIn({ email: input.email, password: input.password });
      await persistToken(token);
      const user = await api.getMe();
      set({ status: "authenticated", token, user });
    } catch (err) {
      await persistToken(null);
      set({ status: "guest", error: friendlyError(err) });
      throw err;
    }
  },

  signOut: async () => {
    await persistToken(null);
    queryClient.removeQueries();
    set({ status: "guest", token: null, user: null, error: null });
  },

  refreshUser: async () => {
    const user = await api.getMe();
    set({ user });
    queryClient.setQueryData(queryKeys.me, user);
  },

  updateProfile: async (input) => {
    const user = await api.updateMe(input);
    set({ user });
    queryClient.setQueryData(queryKeys.me, user);
  },

  clearError: () => set({ error: null }),
}));
