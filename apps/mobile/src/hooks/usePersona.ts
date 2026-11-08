import { useEffect, useState } from "react";
import {
  getPersona,
  getPersonaId,
  setPersonaId as persistPersonaId,
  type Persona,
  type PersonaId,
} from "../lib/personas";

/**
 * The user's chosen style persona. Persisted in AsyncStorage; null means
 * "no persona" (the standard Today's Fit behavior).
 *
 * The loaded id is shared across hook instances via a module-level cache,
 * so the vibe picker in the header and Today's Fit always agree — changing
 * the persona in one place updates every consumer immediately.
 */
let cachedId: PersonaId | null | undefined;
const listeners = new Set<(id: PersonaId | null) => void>();

function broadcast(id: PersonaId | null) {
  cachedId = id;
  listeners.forEach((listener) => listener(id));
}

export function usePersona() {
  const [personaId, setPersonaIdState] = useState<PersonaId | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let live = true;
    const apply = (id: PersonaId | null) => {
      if (live) {
        setPersonaIdState(id);
        setIsPending(false);
      }
    };
    listeners.add(apply);
    if (cachedId !== undefined) {
      apply(cachedId);
    } else {
      // Always broadcast so the cache warms even if this instance unmounted.
      void getPersonaId().then((id) => broadcast(id));
    }
    return () => {
      listeners.delete(apply);
      live = false;
    };
  }, []);

  const setPersonaId = async (id: PersonaId | null) => {
    await persistPersonaId(id);
    broadcast(id);
  };

  const persona: Persona | undefined = getPersona(personaId);

  return { personaId, persona, setPersonaId, isPending };
}
