# DripCast

A Gen Z weather/outfit mobile app — your closet, tuned to the sky. Fresh Expo
(SDK 57) frontend for the existing WTWR backend API. **The backend is an
external service and is not modified by this repo.**

## Monorepo layout

```
dripcast/
├── apps/mobile/            # Expo app (SDK 57, TypeScript strict)
│   ├── app/                # Expo Router routes (file-based)
│   │   ├── (auth)/         # sign-in, sign-up
│   │   ├── (tabs)/         # home, closet, favorites, album
│   │   ├── profile.tsx
│   │   └── _layout.tsx     # providers + auth gate
│   ├── src/
│   │   ├── components/     # Screen, Button, TextField, HeroBanner, …
│   │   ├── hooks/          # useWeather (OpenWeatherMap + expo-location)
│   │   ├── lib/            # api singleton, query client, weather buckets
│   │   └── store/          # Zustand auth store (JWT in SecureStore)
│   ├── assets/hero/        # cyberpunk hero banners, swapped by weather
│   ├── app.json            # Expo config
│   └── eas.json            # EAS Build profiles
├── packages/api/           # Typed fetch client for the backend API
└── packages/theme/         # Cyberpunk dark-theme design tokens
```

## Prerequisites

- Node.js 20+
- An [OpenWeatherMap](https://openweathermap.org/api) API key (free tier works)
- For device builds: an [Expo](https://expo.dev) account + `npx eas-cli`

## Install

```bash
npm install
```

## Environment

Expo reads env files from inside `apps/mobile/`:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable | Purpose | Default |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Backend API base URL (no trailing slash) | `https://se-project-express-5lx6.onrender.com` (detected from the live WTWR web bundle) |
| `EXPO_PUBLIC_WEATHER_API_KEY` | OpenWeatherMap key | — (required; home screen shows an error card without it) |

## Run

```bash
# from the repo root
npm start          # Expo dev server (scan the QR with Expo Go)

# or inside apps/mobile
npm run ios        # iOS simulator (macOS) — also works in Expo Go
npm run android    # Android emulator / device
npm run web        # web preview
```

## Typecheck

```bash
npm run typecheck          # all workspaces
npm run typecheck:mobile   # apps/mobile only (tsc --noEmit, strict)
```

## EAS builds

> Do not run these without Expo credentials. First run `npx eas-cli init`
> inside `apps/mobile` to link your Expo project (replaces the placeholder
> `extra.eas.projectId` in `app.json`).

```bash
cd apps/mobile
npx eas-cli build --profile development --platform all   # dev client, internal
npx eas-cli build --profile preview --platform all       # internal preview
npx eas-cli build --profile production --platform all   # store build
npx eas-cli submit --platform ios                       # after a production build
```

## How it works

- **Auth**: email/password via `POST /signin|/signup`; the JWT lives in
  `expo-secure-store`, hydrated into a Zustand store on launch. The root
  layout redirects guests to `(auth)` and signed-in users to `(tabs)/home`.
- **Home**: `expo-location` (falls back to Plano, TX 33.0198, -96.6989 when
  denied) → OpenWeatherMap → `hot ≥ 80°F` / `warm 66–80°F` / `cold`
  buckets → wardrobe items filtered by bucket, under a hero banner that
  swaps art per bucket.
- **Server state**: TanStack Query (`GET /items|/favorites|/gallery`,
  mutations for add/delete/like/upload). UI/auth state: Zustand.
- **Backend contract**: typed in `packages/api` — GETs return bare arrays,
  mutations return `{ data: T }`. Shapes were verified against the live API
  and its public controllers.

## Tech choices

- **Expo SDK 57 (latest stable), not ejected** — managed workflow + EAS.
- **Expo Router** file-based routing with typed routes.
- **NativeWind v4 + Tailwind v4** (`@theme` tokens mirror `packages/theme`).
- **No axios** — the typed `fetch` client in `packages/api` is sufficient.
- **No payments yet** — monetization (RevenueCat) is a later phase.
