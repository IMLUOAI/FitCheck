import { create } from "zustand";
import { AppState, type AppStateStatus } from "react-native";
import {
  addCustomerInfoListener,
  configurePurchases,
  getCustomerInfo,
  identifyPurchasesUser,
  toProStatus,
} from "../lib/purchases";

/**
 * Pro subscription state (RevenueCat `dripcast_pro` entitlement).
 *
 * RevenueCat's customer info is the source of truth — it reflects purchases
 * made on any device and server-side webhook updates. The backend mirrors it
 * for safety, but the app reads from here.
 */
interface SubscriptionState {
  isPro: boolean;
  expirationDate: string | null;
  /** True once the first load has completed (successfully or not). */
  initialized: boolean;
  loading: boolean;
  error: string | null;
  /**
   * Configure RevenueCat and load the current status. Pass the backend user
   * id when signed in so purchase events map back to the user server-side.
   */
  init: (appUserId?: string) => Promise<void>;
  /** Re-read customer info (e.g. on app foreground). */
  refresh: () => Promise<void>;
  /** Start listening for RevenueCat customer-info updates + foreground refresh. */
  startListeners: () => void;
}

let listenersStarted = false;

export const useSubscriptionStore = create<SubscriptionState>()((set, get) => ({
  isPro: false,
  expirationDate: null,
  initialized: false,
  loading: false,
  error: null,

  init: async (appUserId?: string) => {
    set({ loading: true, error: null });
    try {
      configurePurchases();
      const info = appUserId
        ? await identifyPurchasesUser(appUserId)
        : await getCustomerInfo();
      const { isPro, expirationDate } = toProStatus(info);
      set({ isPro, expirationDate, initialized: true, loading: false });
    } catch (err) {
      // Missing keys / no network: stay free-tier, surface nothing fatal.
      set({
        loading: false,
        initialized: true,
        error: err instanceof Error ? err.message : "Couldn't check subscription status.",
      });
    }
  },

  refresh: async () => {
    try {
      const info = await getCustomerInfo();
      const { isPro, expirationDate } = toProStatus(info);
      set({ isPro, expirationDate, error: null });
    } catch {
      // Silent: a failed background refresh shouldn't flip the UI.
    }
  },

  startListeners: () => {
    if (listenersStarted) return;
    listenersStarted = true;
    addCustomerInfoListener((info) => {
      const { isPro, expirationDate } = toProStatus(info);
      set({ isPro, expirationDate });
    });
    const onAppState = (status: AppStateStatus) => {
      if (status === "active") void get().refresh();
    };
    AppState.addEventListener("change", onAppState);
  },
}));

/** Convenience selector for gating features. */
export function useIsPro(): boolean {
  return useSubscriptionStore((s) => s.isPro);
}
