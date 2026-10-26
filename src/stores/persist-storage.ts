import type { PersistStorage } from "zustand/middleware";

export type SaveState = "idle" | "saving" | "saved" | "error";

export type SaveStatus = {
  state: SaveState;
  /** When the last write succeeded (ms since epoch), or null. */
  savedAt: number | null;
};

type Options = {
  /** Writes are batched: at most one per this window. */
  delayMs: number;
  /** How long "saved" is reported before going back to idle. */
  savedMs: number;
  /** Injectable for tests; defaults to window.localStorage. */
  storage?: () => Pick<Storage, "getItem" | "setItem" | "removeItem">;
};

/**
 * A zustand PersistStorage over localStorage that serializes at most once per
 * `delayMs` (otherwise every keystroke re-stringifies the whole history) and
 * reports what it is doing, so the UI can show real save state. A pending
 * write is flushed when the page is hidden or unloaded, so nothing is lost.
 */
export function createDebouncedStorage<T>({
  delayMs,
  savedMs,
  storage = () => localStorage,
}: Options) {
  let status: SaveStatus = { state: "idle", savedAt: null };
  const listeners = new Set<() => void>();
  const setStatus = (next: SaveStatus) => {
    status = next;
    for (const listener of listeners) listener();
  };

  let pending: (() => void) | null = null;
  let writeTimer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(writeTimer);
    const write = pending;
    pending = null;
    if (!write) return;
    try {
      write();
      setStatus({ state: "saved", savedAt: Date.now() });
      clearTimeout(idleTimer);
      idleTimer = setTimeout(
        () => setStatus({ ...status, state: "idle" }),
        savedMs,
      );
    } catch {
      // Quota exceeded or storage blocked; the next change retries.
      setStatus({ ...status, state: "error" });
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  const persistStorage: PersistStorage<T> = {
    getItem: (name) => {
      const raw = storage().getItem(name);
      return raw === null ? null : JSON.parse(raw);
    },
    setItem: (name, value) => {
      pending = () => storage().setItem(name, JSON.stringify(value));
      clearTimeout(idleTimer);
      if (status.state !== "saving") setStatus({ ...status, state: "saving" });
      clearTimeout(writeTimer);
      writeTimer = setTimeout(flush, delayMs);
    },
    removeItem: (name) => {
      pending = null;
      clearTimeout(writeTimer);
      storage().removeItem(name);
    },
  };

  return {
    storage: persistStorage,
    flush,
    getStatus: () => status,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
