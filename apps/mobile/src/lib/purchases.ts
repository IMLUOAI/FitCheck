import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

/**
 * RevenueCat (in-app subscriptions) wrapper for DripCast.
 *
 * Entitlement id: "dripcast_pro"
 *
 * IMPORTANT: purchases only work in a dev build (`npx expo run:ios`,
 * `npx expo run:android`, or an EAS dev build) — NOT in Expo Go, because
 * react-native-purchases is a native module.
 *
 * RevenueCat's `app_user_id` is set to the backend user's Mongo _id (see
 * useSubscription.init), so the server webhook can match purchase events
 * back to the right user.
 */

export const PRO_ENTITLEMENT_ID = "dripcast_pro";

export interface ProStatus {
  isPro: boolean;
  /** ISO date string of entitlement expiration, or null for lifetime/unknown. */
  expirationDate: string | null;
}

function apiKey(): string {
  const key =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;
  if (!key) {
    throw new Error(
      `RevenueCat ${Platform.OS === "ios" ? "Apple" : "Google"} SDK key is missing. ` +
        "Add EXPO_PUBLIC_REVENUECAT_APPLE_KEY / EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY to apps/mobile/.env.",
    );
  }
  return key;
}

let configured = false;

/** Configure the SDK once. Safe to call repeatedly. */
export function configurePurchases(): void {
  if (configured) return;
  Purchases.configure({ apiKey: apiKey() });
  configured = true;
}

/**
 * Identify the RevenueCat customer as the backend user. Call after sign-in
 * (and on app start when a token exists) so webhooks map to the right user.
 */
export async function identifyPurchasesUser(appUserId: string): Promise<CustomerInfo> {
  configurePurchases();
  const { customerInfo } = await Purchases.logIn(appUserId);
  return customerInfo;
}

/** Current offering (the "default" offering holds the monthly + yearly packages). */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  configurePurchases();
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  configurePurchases();
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  configurePurchases();
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  configurePurchases();
  return Purchases.getCustomerInfo();
}

/** Keep the store in sync whenever RevenueCat pushes a customer-info update. */
export function addCustomerInfoListener(listener: (info: CustomerInfo) => void): void {
  Purchases.addCustomerInfoUpdateListener(listener);
}

/** Normalize RevenueCat customer info to the shape the app cares about. */
export function toProStatus(info: CustomerInfo): ProStatus {
  const entitlement = info.entitlements.active[PRO_ENTITLEMENT_ID];
  return {
    isPro: Boolean(entitlement),
    expirationDate: entitlement?.expirationDate ?? null,
  };
}

/** True when the user dismissed the purchase sheet themselves — not an error. */
export function isUserCancelled(err: unknown): boolean {
  return (err as PurchasesError)?.userCancelled === true;
}
