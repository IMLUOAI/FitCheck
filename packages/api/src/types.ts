/**
 * Backend API contract types. Shapes verified against the production API
 * (https://se-project-express-5lx6.onrender.com) and its controllers:
 * - GET endpoints return bare arrays / objects
 * - POST/PUT/PATCH/DELETE mutations return `{ data: T }` (deletes add `message`)
 */

/** Weather bucket used to tag wardrobe items. */
export type WeatherBucket = "hot" | "warm" | "cold";

export const WEATHER_BUCKETS: readonly WeatherBucket[] = ["hot", "warm", "cold"] as const;

export function isWeatherBucket(value: string): value is WeatherBucket {
  return (WEATHER_BUCKETS as readonly string[]).includes(value);
}

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface ClothingItem {
  _id: string;
  name: string;
  /** Backend stores lowercase "hot" | "warm" | "cold". */
  weather: string;
  imageUrl: string;
  /** User ids that liked this item. */
  likes: string[];
  owner: string;
  createdAt: string;
}

export type FavoriteType = "photo" | "video";

export interface Favorite {
  _id: string;
  type: FavoriteType;
  url: string;
  title: string;
  owner: string;
  createdAt: string;
}

export type GalleryKind = "photo" | "video";
export type GallerySource = "link" | "upload";

export interface GalleryItem {
  _id: string;
  kind: GalleryKind;
  source: GallerySource;
  url: string;
  title: string;
  owner: string;
  createdAt: string;
}

/** `{ data: T }` envelope the backend wraps mutation responses in. */
export interface DataEnvelope<T> {
  data: T;
  message?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name: string;
  /** Backend requires an avatar string at signup; callers may pass "". */
  avatar: string;
  email: string;
  password: string;
}

export interface AddItemInput {
  name: string;
  weather: WeatherBucket;
  imageUrl: string;
}

export interface AddFavoriteInput {
  type: FavoriteType;
  url: string;
  title: string;
}

export interface AddGalleryLinkInput {
  kind: GalleryKind;
  url: string;
  title: string;
}

/** File picked on-device for gallery upload (backend: multipart field "file", 25MB max). */
export interface GalleryUploadFile {
  uri: string;
  name: string;
  mimeType: string;
}

export interface UpdateProfileInput {
  name: string;
  avatar: string;
}

/** Public profile — the only user fields the backend ever exposes publicly. */
export interface PublicUser {
  _id: string;
  name: string;
  avatar: string;
}

/** Owner shape as populated on fits/battles (`_id name avatar`). */
export interface FitOwner {
  _id: string;
  name: string;
  avatar: string;
}

/** Item shape as populated on fits (`_id name imageUrl weather`). */
export interface FitItem {
  _id: string;
  name: string;
  imageUrl: string;
  weather: string;
}

/** Saved outfit. `owner`/`items` may be populated objects or raw ids. */
export interface Fit {
  _id: string;
  owner: FitOwner | string;
  items: Array<FitItem | string>;
  weather: WeatherBucket;
  note?: string;
  likes: string[];
  createdAt: string;
}

/** A-vs-B outfit battle. `fitA`/`fitB` are populated on GET /battles. */
export interface Battle {
  _id: string;
  fitA: Fit | string;
  fitB: Fit | string;
  createdBy: FitOwner | string;
  votesA: number;
  votesB: number;
  voters: string[];
  status: "open" | "closed";
  createdAt: string;
}

export type BattlePick = "A" | "B";

export interface CreateFitInput {
  items: string[];
  weather: WeatherBucket;
  note?: string;
}

export interface CreateBattleInput {
  fitA: string;
  fitB: string;
}

export interface GetFitsParams {
  owner?: string;
  limit?: number;
  page?: number;
}

export interface GetBattlesParams {
  status?: "open" | "closed";
  limit?: number;
  page?: number;
}

/** Normalize a fit's owner to its id whether populated or raw. */
export function fitOwnerId(fit: Fit): string {
  return typeof fit.owner === "string" ? fit.owner : fit.owner._id;
}

/** Normalize a fit's owner to a displayable profile. */
export function fitOwnerProfile(fit: Fit): FitOwner | null {
  return typeof fit.owner === "string" ? null : fit.owner;
}

/** Normalize a fit's items to ids whether populated or raw. */
export function fitItemIds(fit: Fit): string[] {
  return fit.items.map((i) => (typeof i === "string" ? i : i._id));
}

/** Normalize a fit's items to displayable thumbnails (populated only). */
export function fitDisplayItems(fit: Fit): FitItem[] {
  return fit.items.filter((i): i is FitItem => typeof i !== "string");
}

/** Normalize a battle side to a full fit when populated. */
export function battleFit(battle: Battle, side: BattlePick): Fit | null {
  const fit = side === "A" ? battle.fitA : battle.fitB;
  return typeof fit === "string" ? null : fit;
}
