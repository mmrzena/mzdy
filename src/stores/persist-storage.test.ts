import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { createDebouncedStorage } from "./persist-storage";

function memoryStorage() {
  const data = new Map<string, string>();
  let fail = false;
  return {
    data,
    failNext: () => {
      fail = true;
    },
    api: () => ({
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (fail) {
          fail = false;
          throw new Error("QuotaExceededError");
        }
        data.set(k, v);
      },
      removeItem: (k: string) => {
        data.delete(k);
      },
    }),
  };
}

test("batches writes and reports saving → saved → idle", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
  try {
    const mem = memoryStorage();
    const s = createDebouncedStorage<{ n: number }>({
      delayMs: 300,
      savedMs: 2000,
      storage: mem.api,
    });
    const seen: string[] = [];
    s.subscribe(() => seen.push(s.getStatus().state));

    for (const n of [1, 2, 3])
      s.storage.setItem("k", { state: { n }, version: 0 });
    assert.equal(s.getStatus().state, "saving");
    assert.equal(mem.data.size, 0);

    mock.timers.tick(300);
    assert.equal(s.getStatus().state, "saved");
    assert.equal(s.getStatus().savedAt, 1300);
    assert.equal(JSON.parse(mem.data.get("k") ?? "").state.n, 3);

    mock.timers.tick(2000);
    assert.equal(s.getStatus().state, "idle");
    assert.equal(s.getStatus().savedAt, 1300);
    assert.deepEqual(seen, ["saving", "saved", "idle"]);
  } finally {
    mock.timers.reset();
  }
});

test("a failed write reports error until the next change succeeds", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    const mem = memoryStorage();
    const s = createDebouncedStorage<{ n: number }>({
      delayMs: 300,
      savedMs: 2000,
      storage: mem.api,
    });
    mem.failNext();
    s.storage.setItem("k", { state: { n: 1 }, version: 0 });
    mock.timers.tick(300);
    assert.equal(s.getStatus().state, "error");
    mock.timers.tick(5000);
    assert.equal(s.getStatus().state, "error");

    s.storage.setItem("k", { state: { n: 2 }, version: 0 });
    s.flush();
    assert.equal(s.getStatus().state, "saved");
    assert.equal(JSON.parse(mem.data.get("k") ?? "").state.n, 2);
  } finally {
    mock.timers.reset();
  }
});
