import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import { usePalette } from "../store/theme";
import { useSubscriptionStore } from "../store/useSubscription";
import {
  getCurrentOffering,
  isUserCancelled,
  purchasePackage,
  restorePurchases,
  toProStatus,
} from "../lib/purchases";

const TERMS_URL = "https://dripcast.app/terms";
const PRIVACY_URL = "https://dripcast.app/privacy";

const PERKS = [
  { icon: "bookmark", title: "Unlimited saved fits", subtitle: "Keep every outfit you love, forever" },
  { icon: "trophy", title: "Unlimited fit battles", subtitle: "Start as many battles as you want, every day" },
  { icon: "sparkles", title: "First dibs on new drops", subtitle: "New DripCast features land for Pro first" },
] as const;

/** Fallback package rows when the RevenueCat offering fails to load. */
const FALLBACK_PACKAGES = [
  { id: "monthly", label: "Monthly", price: "$2.99/mo", detail: "Billed monthly. Cancel anytime." },
  { id: "yearly", label: "Yearly", price: "$19.99/yr", detail: "Two months free vs monthly." },
] as const;

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  /** Shown above the packages when the paywall opened from a limit. */
  contextMessage?: string;
}

function priceFor(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

export function Paywall({ visible, onClose, contextMessage }: PaywallProps) {
  const palette = usePalette();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [offeringError, setOfferingError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setOfferingError(false);
    let cancelled = false;
    void getCurrentOffering()
      .then((o) => {
        if (!cancelled) setOffering(o);
      })
      .catch(() => {
        if (!cancelled) setOfferingError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const applyPro = (isPro: boolean, expirationDate: string | null) => {
    useSubscriptionStore.setState({ isPro, expirationDate, error: null });
  };

  const handlePurchase = (pkg: PurchasesPackage) => {
    if (busyId) return;
    setBusyId(pkg.identifier);
    setError(null);
    void purchasePackage(pkg)
      .then((info) => {
        const { isPro, expirationDate } = toProStatus(info);
        if (isPro) {
          applyPro(isPro, expirationDate);
          onClose();
        } else {
          setError("Purchase went through but Pro isn't active yet — try Restore below.");
        }
      })
      .catch((err: unknown) => {
        if (!isUserCancelled(err)) {
          setError("Purchase didn't complete. Check your payment method and try again.");
        }
      })
      .finally(() => setBusyId(null));
  };

  const handleRestore = () => {
    if (restoring) return;
    setRestoring(true);
    setError(null);
    void restorePurchases()
      .then((info) => {
        const { isPro, expirationDate } = toProStatus(info);
        if (isPro) {
          applyPro(isPro, expirationDate);
          onClose();
        } else {
          setError("No active Pro subscription found on this account.");
        }
      })
      .catch(() => setError("Couldn't restore purchases. Try again."))
      .finally(() => setRestoring(false));
  };

  const openLink = (url: string) => {
    void Linking.openURL(url).catch(() => setError("Couldn't open that link."));
  };

  const packages = offering?.availablePackages ?? [];
  const busy = busyId !== null || restoring;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-void">
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          <View className="mb-2 flex-row items-center justify-end">
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={palette.muted} />
            </Pressable>
          </View>

          <View className="mb-1 items-center">
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: `${palette.neonPink}26` }}
            >
              <Ionicons name="diamond" size={30} color={palette.neonPink} />
            </View>
            <Text className="text-center text-3xl font-black tracking-tight text-text">
              Go <Text className="text-neon-pink">Pro</Text>
            </Text>
            <Text className="mt-2 text-center text-sm text-muted">
              Unlock the full DripCast experience.
            </Text>
          </View>

          {contextMessage ? (
            <View
              className="mb-4 mt-4 rounded-xl border border-line bg-panel-raised p-3"
            >
              <Text className="text-center text-sm font-semibold text-text">{contextMessage}</Text>
            </View>
          ) : null}

          <View className="mb-5 mt-4 gap-3">
            {PERKS.map((perk) => (
              <View key={perk.title} className="flex-row items-center rounded-xl border border-line bg-panel p-3.5">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${palette.neonPink}1F` }}
                >
                  <Ionicons name={perk.icon} size={20} color={palette.neonPink} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-text">{perk.title}</Text>
                  <Text className="text-xs text-muted">{perk.subtitle}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={palette.neonPink} />
              </View>
            ))}
          </View>

          {packages.length > 0 ? (
            <View className="gap-2.5">
              {packages.map((pkg) => {
                const isBusy = busyId === pkg.identifier;
                const isYearly = /year|annual/i.test(pkg.identifier) || /year|annual/i.test(pkg.packageType);
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => handlePurchase(pkg)}
                    disabled={busy}
                    className={`rounded-2xl border p-4 ${isYearly ? "border-neon-pink" : "border-line"} bg-panel-raised`}
                    style={isYearly ? { borderWidth: 2 } : undefined}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-base font-black text-text">
                          {isYearly ? "Yearly" : "Monthly"}
                        </Text>
                        <Text className="mt-0.5 text-xs text-muted">
                          {isYearly ? "Best value — two months free" : "Flexible. Cancel anytime."}
                        </Text>
                      </View>
                      {isBusy ? (
                        <ActivityIndicator color={palette.neonPink} />
                      ) : (
                        <Text className="text-lg font-black text-neon-pink">{priceFor(pkg)}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : offeringError ? (
            <View className="gap-2.5">
              {FALLBACK_PACKAGES.map((pkg) => (
                <View key={pkg.id} className="rounded-2xl border border-line bg-panel-raised p-4 opacity-60">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-black text-text">{pkg.label}</Text>
                      <Text className="mt-0.5 text-xs text-muted">{pkg.detail}</Text>
                    </View>
                    <Text className="text-lg font-black text-neon-pink">{pkg.price}</Text>
                  </View>
                </View>
              ))}
              <Text className="mt-1 text-center text-xs text-muted">
                Couldn't load live prices — check your connection and reopen this screen.
              </Text>
            </View>
          ) : (
            <View className="items-center py-6">
              <ActivityIndicator color={palette.neonPink} />
            </View>
          )}

          {error ? <Text className="mt-3 text-center text-sm text-danger">{error}</Text> : null}

          <Pressable onPress={handleRestore} disabled={busy} hitSlop={8} className="mt-4">
            <Text className="text-center text-sm font-semibold text-neon-pink">
              {restoring ? "Restoring…" : "Restore purchases"}
            </Text>
          </Pressable>

          <View className="mt-3 flex-row items-center justify-center gap-4">
            <Pressable onPress={() => openLink(TERMS_URL)} hitSlop={8}>
              <Text className="text-xs text-muted underline">Terms of Use</Text>
            </Pressable>
            <Pressable onPress={() => openLink(PRIVACY_URL)} hitSlop={8}>
              <Text className="text-xs text-muted underline">Privacy Policy</Text>
            </Pressable>
          </View>
          <Text className="mt-3 text-center text-xs text-faint">
            Payment is charged to your App Store / Google Play account at confirmation. Subscriptions
            auto-renew unless cancelled at least 24 hours before the period ends.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
