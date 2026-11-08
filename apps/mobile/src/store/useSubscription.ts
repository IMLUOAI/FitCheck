import { create } from "zustand";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
 *
 * On top of that, every install gets a local 15-day free trial: Pro is
 * unlocked from first launch for 15 days, no payment and no RevenueCat
 * needed. The clock starts once (first launch) and is stored locally, so
 * reinstalling the app restarts it.
 */
const TRIAL_DAYS = 15;
const TRIAL_START_KEY = "fitcheck-trial-start";
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

interface SubscriptionState {
  isPro: boolean;
  expirationDate: string | null;
  /** True once the first load has completed (successfully or not). */
  initialized: boolean;
  loading: boolean;
  error: string | null;
  /** Local 15-day trial: true while the trial window is open. */
  trialActive: boolean;
  /** Whole days left in the trial (0 once it has ended). */
  trialDaysLeft: number | null;
  /** Trial end timestamp (ms), or null before the first check. */
  trialEndsAt: number | null;
  /**
   * Configure RevenueCat and load the current status. Pass the backend user
   * id when signed in so purchase events map back to the user server-side.
   */
  init: (appUserId?: string) => Promise<void>;
  /** Re-read customer info (e.g. on app foreground). */
  refresh: () => Promise<void>;
  /** Start (first launch) or re-check the local 15-day trial clock. */
  initTrial: () => Promise<void>;
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
  trialActive: false,
  trialDaysLeft: null,
  trialEndsAt: null,

  init: async (appUserId?: string) => {
    void get().initTrial();
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
    void get().initTrial();
    try {
      const info = await getCustomerInfo();
      const { isPro, expirationDate } = toProStatus(info);
      set({ isPro, expirationDate, error: null });
    } catch {
      // Silent: a failed background refresh shouldn't flip the UI.
    }
  },

  initTrial: async () => {
    try {
      let start = await AsyncStorage.getItem(TRIAL_START_KEY);
      if (!start) {
        start = String(Date.now());
        await AsyncStorage.setItem(TRIAL_START_KEY, start);
      }
      const endsAt = Number(start) + TRIAL_MS;
      const daysLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / (24 * 60 * 60 * 1000)));
      set({ trialActive: daysLeft > 0, trialDaysLeft: daysLeft, trialEndsAt: endsAt });
    } catch {
      set({ trialActive: false, trialDaysLeft: null, trialEndsAt: null });
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

/** Convenience selector for gating features. Paid Pro OR the 15-day trial. */
export function useIsPro(): boolean {
  const subPro = useSubscriptionStore((s) => s.isPro);
  const trialActive = useSubscriptionStore((s) => s.trialActive);
  return subPro || trialActive;
}

/** Trial status for the paywall: active? how many days left? */
export function useTrial(): { active: boolean; daysLeft: number | null; endsAt: number | null } {
  const active = useSubscriptionStore((s) => s.trialActive);
  const daysLeft = useSubscriptionStore((s) => s.trialDaysLeft);
  const endsAt = useSubscriptionStore((s) => s.trialEndsAt);
  return { active, daysLeft, endsAt };
}
