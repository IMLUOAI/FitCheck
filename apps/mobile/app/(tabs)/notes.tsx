import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { usePalette } from "../../src/store/theme";
import {
  loadNotes,
  newNote,
  notePreview,
  noteTitle,
  saveNotes,
  type Note,
} from "../../src/lib/notes";
import { timeAgo } from "../../src/lib/timeAgo";

/**
 * Notes tab: a quick-capture pad for important things, numbers, and
 * passwords. Notes live on this phone only — nothing is uploaded — so
 * they stay private to the device. Newest-edited first, searchable,
 * auto-saved as you type.
 */
export default function NotesScreen() {
  const palette = usePalette();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadNotes().then((ns) => {
      setNotes(ns);
      setLoaded(true);
    });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const editing = editingId
    ? notes.find((n) => n.id === editingId) ?? null
    : null;

  const scheduleSave = (next: Note[]) => {
    setNotes(next);
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void saveNotes(next).then(() => setSaveState("saved"));
    }, 500);
  };

  const flushSave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void saveNotes(notes).then(() => setSaveState("saved"));
  };

  const openNote = (note: Note) => {
    setEditingId(note.id);
    setDraft(note.body);
    setSaveState("saved");
  };

  const createNote = () => {
    const note = newNote();
    const next = [note, ...notes];
    setNotes(next);
    void saveNotes(next);
    openNote(note);
  };

  const onDraftChange = (text: string) => {
    setDraft(text);
    if (!editingId) return;
    const next = notes.map((n) =>
      n.id === editingId ? { ...n, body: text, updatedAt: Date.now() } : n,
    );
    scheduleSave(next);
  };

  const deleteEditing = () => {
    if (!editingId) return;
    Alert.alert("Delete note?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const next = notes.filter((n) => n.id !== editingId);
          if (timerRef.current) clearTimeout(timerRef.current);
          setNotes(next);
          void saveNotes(next);
          setEditingId(null);
        },
      },
    ]);
  };

  const goBack = () => {
    flushSave();
    setEditingId(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.body.toLowerCase().includes(q));
  }, [notes, query]);

  if (editing) {
    return (
      <Screen>
        <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
          <Pressable
            onPress={goBack}
            hitSlop={12}
            className="flex-row items-center py-2"
          >
            <Ionicons name="chevron-back" size={22} color={palette.neonPink} />
            <Text className="text-base font-bold" style={{ color: palette.neonPink }}>
              Notes
            </Text>
          </Pressable>
          <Pressable onPress={deleteEditing} hitSlop={12} className="py-2">
            <Text className="text-sm font-bold" style={{ color: palette.danger }}>
              Delete
            </Text>
          </Pressable>
        </View>
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder="Jot it down…"
          placeholderTextColor={palette.faint}
          multiline
          autoFocus
          textAlignVertical="top"
          className="flex-1 px-5 text-base leading-6 text-text"
        />
        <View className="flex-row items-center justify-between px-5 pb-4 pt-2">
          <Text className="text-xs text-faint">
            Stored on this phone only — never uploaded.
          </Text>
          <Text className="text-xs text-muted">
            {saveState === "saving" ? "Saving…" : "Saved"}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="px-5 pt-5">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-2xl font-black text-text">Notes</Text>
          <Pressable
            onPress={createNote}
            className="flex-row items-center rounded-full bg-neon-pink px-4 py-2.5"
          >
            <Ionicons name="add" size={18} color={palette.void} />
            <Text className="ml-1 text-sm font-bold text-void">New note</Text>
          </Pressable>
        </View>
        <Text className="mb-4 text-sm leading-5 text-muted">
          Important things, numbers, passwords — jotted down and kept on this
          phone only.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes…"
          placeholderTextColor={palette.faint}
          className="mb-4 rounded-2xl border border-line bg-panel px-4 py-3 text-base text-text"
        />
      </View>
      {!loaded ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-muted">Loading notes…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openNote(item)}
              className="mb-3 rounded-2xl border border-line bg-panel p-4"
            >
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-base font-bold text-text" numberOfLines={1}>
                  {noteTitle(item.body)}
                </Text>
                <Text className="ml-3 text-xs text-faint">
                  {timeAgo(new Date(item.updatedAt).toISOString())}
                </Text>
              </View>
              {notePreview(item.body) ? (
                <Text className="mt-1 text-sm text-muted" numberOfLines={2}>
                  {notePreview(item.body)}
                </Text>
              ) : null}
            </Pressable>
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title={query ? "No notes match" : "No notes yet"}
              subtitle={
                query
                  ? "Try a different word or number."
                  : "Tap New note to jot down something important."
              }
            />
          }
        />
      )}
    </Screen>
  );
}
