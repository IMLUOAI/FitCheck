# RevenueCat setup checklist — DripCast Pro subscriptions

Everything the app code needs is already built. The steps below are the
accounts, products, and keys only you can create. Do them in order.

**Prices below are suggestions — set whatever you want.** The app reads the
real price from the store, so nothing in the code changes if you pick
different numbers.

---

## Step 0 — Backend: add the Pro fields + mount the webhook (5 min)

In your `se_project_express` repo, add two fields to the User schema
(`models/user.js` or wherever your user schema lives):

```js
isPro:        { type: Boolean, default: false },
proExpiresAt: { type: Date,    default: null   },
```

Copy `revenuecat-webhook.js` (from this same folder) into your routes
folder, then mount it in your main app file (`app.js`):

```js
app.use("/webhooks/revenuecat", require("./routes/revenuecat-webhook"));
```

Set an env var on the server (Render dashboard → your service → Environment):

```
REVENUECAT_WEBHOOK_SECRET=<make up a long random string, save it — you paste it into RevenueCat in step 7>
```

Redeploy the backend. (You can batch this with the social patch deploy.)

## Step 1 — Create a RevenueCat account + project

Go to https://app.revenuecat.com → sign up → create a project named **DripCast**.

## Step 2 — Add the iOS app

In RevenueCat: Project → Apps → **Add app** → iOS.

- Bundle ID: `com.dripcast.app` (already set in the app's `app.json`)
- You'll need the app set up in **App Store Connect** first, with two
  **auto-renewable subscription** products. Suggested product IDs:
  - `dripcast_pro_monthly` — suggested $2.99/month
  - `dripcast_pro_yearly` — suggested $19.99/year
- In App Store Connect, add your App Store Connect API key / shared secret so
  RevenueCat can verify receipts (RevenueCat's iOS setup page walks you
  through it).

> ⚠️ The bundle ID can never change for these products. If you rename the
> app later, that's fine — the display name "DripCast" is just a label.
> Changing the bundle ID would mean recreating all store products.

## Step 3 — Add the Android app

In RevenueCat: Project → Apps → **Add app** → Android.

- Package name: `com.dripcast.app` (already set in the app's `app.json`)
- Create the same two **subscriptions** in **Google Play Console**
  (same product IDs: `dripcast_pro_monthly`, `dripcast_pro_yearly`) and link
  your Play service-account credentials in RevenueCat's Android setup page.

## Step 4 — Create the entitlement

In RevenueCat: Project → Entitlements → **New entitlement**

- Identifier: `dripcast_pro` (must match exactly — the app checks this name)
- Attach **both** products (monthly + yearly, iOS + Android) to it.

## Step 5 — Create the offering

In RevenueCat: Project → Offerings → **New offering**

- Identifier: `default` (the app reads the current/default offering)
- Add two packages: **Monthly** → `dripcast_pro_monthly`, **Yearly** → `dripcast_pro_yearly`

## Step 6 — Paste the public SDK keys into the app

In RevenueCat: Project → API keys. Copy the two **public** app-specific keys
(iOS + Android — not the secret key) into `apps/mobile/.env`:

```
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=<Apple public SDK key>
EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=<Google public SDK key>
```

(Public keys are safe to ship inside the app — they're already wired in
`apps/mobile/.env.example`. The secret key never leaves your server.)

## Step 7 — Point the webhook at your backend

In RevenueCat: Project → Integrations → **Webhooks** → Add webhook

- URL: `https://se-project-express-5lx6.onrender.com/webhooks/revenuecat`
- Authorization header: paste the `REVENUECAT_WEBHOOK_SECRET` value from step 0
- Send a test event from the RevenueCat dashboard and confirm your backend
  logs a 200 (check Render logs).

## Step 8 — Set up EAS (still pending)

In `apps/mobile`:

```
npx eas-cli init
```

This replaces the placeholder project ID in `app.json` with your real Expo
project. Needed before any store or dev-client build.

## Step 9 — Build a dev client (NOT Expo Go)

Purchases use a native module, so they don't work in Expo Go. Build once:

```
npx expo run:ios        # or: npx expo run:android
```

(or `eas build --profile development`). Then open the dev build on your
phone — the paywall, purchases, and restore flow all work there.

---

## What the free plan allows (already coded)

- **Saved fits:** 3 max → hitting "Save as fit" on the 4th opens the paywall
- **Battles:** 1 per day → starting a 2nd opens the paywall
- **Pro:** unlimited fits + unlimited battles

To change the limits later, edit `FREE_FIT_LIMIT` / `FREE_BATTLES_PER_DAY`
in `apps/mobile/src/lib/pro-limits.ts`.

## Testing purchases without spending money

- iOS: use a **sandbox Apple ID** (App Store Connect → Users → Sandbox Testers).
  Sandbox subscriptions renew fast (minutes) so you can test renewals.
- Android: add your Gmail as a **license tester** in Play Console → purchases
  are free test purchases.
- Always test in the **dev build from step 9**, never Expo Go.
