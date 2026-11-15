"use client";

export type Skill = "reading" | "listening" | "writing" | "speaking";

export interface Attempt {
  id: string;
  skill: Skill;
  date: string; // ISO
  band: number;
  title: string;
  detail?: string;
}

const KEY = "ielts-coach:history";

export function loadHistory(): Attempt[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(a: Omit<Attempt, "id" | "date">) {
  try {
    const all = loadHistory();
    all.unshift({ ...a, id: crypto.randomUUID(), date: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 300)));
  } catch {
    /* storage unavailable: ignore */
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Small JSON store for things like saved listening tests. */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
