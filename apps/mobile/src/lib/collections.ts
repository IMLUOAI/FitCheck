import AsyncStorage from "@react-native-async-storage/async-storage";

/** Personal collections shelf: favourite books, songs, and other things. Client-only. */

export type CollectionCategory = "book" | "song" | "other";

export interface CollectionItem {
  id: string;
  title: string;
  creator: string;
  category: CollectionCategory;
  note: string;
  addedAt: number;
  /** Web page for the item (Open Library page, iTunes page, or user-supplied). */
  link?: string;
  /** Cover art (Open Library cover, iTunes artwork). Empty for manual entries. */
  coverUrl?: string;
}

export interface CollectionSearchResult {
  title: string;
  creator: string;
  category: CollectionCategory;
  link?: string;
  coverUrl?: string;
}

const COLLECTIONS_KEY = "dripcast.collections";

function isCategory(value: unknown): value is CollectionCategory {
  return value === "book" || value === "song" || value === "other";
}

function isItem(value: unknown): value is CollectionItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.creator === "string" &&
    isCategory(item.category) &&
    typeof item.note === "string" &&
    typeof item.addedAt === "number"
  );
}

/** Stored shelf, newest first. Never throws. */
export async function loadCollections(): Promise<CollectionItem[]> {
  try {
    const raw = await AsyncStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isItem);
  } catch {
    return [];
  }
}

/** Persist the shelf. Never throws. */
export async function saveCollections(items: CollectionItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(items));
  } catch {
    // Storage failure shouldn't break the shelf; it just won't persist.
  }
}

export function createCollectionItem(input: {
  title: string;
  creator: string;
  category: CollectionCategory;
  note?: string;
  link?: string;
  coverUrl?: string;
}): CollectionItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    title: input.title.trim(),
    creator: input.creator.trim(),
    category: input.category,
    note: (input.note ?? "").trim(),
    addedAt: Date.now(),
    link: (input.link ?? "").trim(),
    coverUrl: (input.coverUrl ?? "").trim(),
  };
}

// In-app search uses free catalogues — no API keys, works in Expo Go.

interface OpenLibraryDoc {
  title?: unknown;
  author_name?: unknown;
  key?: unknown;
  cover_i?: unknown;
}

interface OpenLibraryResponse {
  docs?: unknown;
}

/** Books via the Open Library search API. Returns [] on any failure. */
export async function searchBooks(query: string): Promise<CollectionSearchResult[]> {
  const term = query.trim();
  if (!term) return [];
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=20`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as OpenLibraryResponse;
    if (!Array.isArray(data.docs)) return [];
    const results: CollectionSearchResult[] = [];
    for (const doc of data.docs) {
      const d = doc as OpenLibraryDoc;
      if (typeof d.title !== "string" || !d.title.trim()) continue;
      const authors = Array.isArray(d.author_name)
        ? d.author_name.filter((a): a is string => typeof a === "string")
        : [];
      results.push({
        title: d.title.trim(),
        creator: authors.join(", "),
        category: "book",
        link: typeof d.key === "string" ? `https://openlibrary.org${d.key}` : "",
        coverUrl:
          typeof d.cover_i === "number"
            ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
            : "",
      });
      if (results.length >= 20) break;
    }
    return results;
  } catch {
    return [];
  }
}

interface ITunesTrack {
  trackName?: unknown;
  artistName?: unknown;
  artworkUrl100?: unknown;
  trackViewUrl?: unknown;
}

interface ITunesResponse {
  results?: unknown;
}

/** Songs via the iTunes Search API (no key required). Returns [] on any failure. */
export async function searchSongs(query: string): Promise<CollectionSearchResult[]> {
  const term = query.trim();
  if (!term) return [];
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=20`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as ITunesResponse;
    if (!Array.isArray(data.results)) return [];
    const results: CollectionSearchResult[] = [];
    for (const track of data.results) {
      const t = track as ITunesTrack;
      if (typeof t.trackName !== "string" || !t.trackName.trim()) continue;
      results.push({
        title: t.trackName.trim(),
        creator: typeof t.artistName === "string" ? t.artistName : "",
        category: "song",
        coverUrl: typeof t.artworkUrl100 === "string" ? t.artworkUrl100 : "",
        link: typeof t.trackViewUrl === "string" ? t.trackViewUrl : "",
      });
      if (results.length >= 20) break;
    }
    return results;
  } catch {
    return [];
  }
}
