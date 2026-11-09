import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Notes: the quick-capture pad. Deliberately on-device only — notes live
 * in AsyncStorage on this phone and are never sent to the server, so
 * passwords and numbers jotted here stay private to the device.
 */
export interface Note {
  id: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

const NOTES_KEY = "dripcast.notes";

export function newNote(): Note {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    body: "",
    createdAt: now,
    updatedAt: now,
  };
}

/** Title = first non-empty line, truncated. */
export function noteTitle(body: string): string {
  const first = body.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  if (!first) return "Untitled note";
  return first.length > 60 ? `${first.slice(0, 60)}…` : first;
}

/** Preview = everything after the first line, truncated. */
export function notePreview(body: string): string {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const rest = lines.slice(1).join(" ");
  if (!rest) return "";
  return rest.length > 80 ? `${rest.slice(0, 80)}…` : rest;
}

export async function loadNotes(): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Note>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => typeof n?.id === "string" && typeof n?.body === "string")
      .map((n) => ({
        id: n.id as string,
        body: n.body as string,
        createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // Storage full or unavailable — the in-memory list still works.
  }
}
