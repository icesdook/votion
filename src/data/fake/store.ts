// Capa de datos FALSA (solo desarrollo). Guarda todo en localStorage y sincroniza
// pestañas con BroadcastChannel, para probar colaboración con dos personas en dos pestañas.
// replica-backend la reemplaza por Supabase sin tocar las pantallas: ver src/data/api.ts.
import type { DB, ID } from "../types";
import { seed } from "./seed";

const KEY = "ofi.db.v1";
const SESSION_KEY = "ofi.session"; // por pestaña: cada pestaña puede ser una persona distinta

type Listener = () => void;
let state: DB | null = null;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function emit() {
  for (const l of listeners) l();
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* almacenamiento bloqueado o corrupto: se usa la semilla */
  }
  const s = seed();
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin persistencia, sigue en memoria */
  }
  return s;
}

function init() {
  if (state || typeof window === "undefined") return;
  state = load();
  try {
    channel = new BroadcastChannel("ofi.sync");
    channel.onmessage = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          state = JSON.parse(raw) as DB;
          emit();
        }
      } catch {
        /* ignorar */
      }
    };
  } catch {
    channel = null;
  }
}

export function getDB(): DB | null {
  init();
  return state;
}

export function subscribe(l: Listener) {
  init();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Aplica un cambio de forma atómica: clona, muta, guarda, avisa a la pestaña y a las demás. */
export function mutate<T>(fn: (draft: DB) => T): T {
  init();
  if (!state) throw new Error("store not ready");
  const draft = structuredClone(state);
  const result = fn(draft);
  state = draft;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sin persistencia */
  }
  channel?.postMessage("changed");
  emit();
  return result;
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorar */
  }
  state = null;
  init();
  channel?.postMessage("changed");
  emit();
}

// ---------- sesión
export function getSessionUserId(): ID | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSessionUserId(id: ID | null) {
  try {
    if (id) {
      sessionStorage.setItem(SESSION_KEY, id);
      localStorage.setItem(SESSION_KEY, id); // pestañas nuevas abren con la última persona
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* ignorar */
  }
  emit();
}

export function uid(): ID {
  return crypto.randomUUID();
}

export function now() {
  return new Date().toISOString();
}

/** Simula latencia de red para que los estados de carga se vean y se prueben. */
export function latency(ms = 120) {
  return new Promise((r) => setTimeout(r, ms));
}
