import { describe, expect, it } from "vitest";
import { gameStoreNamesDeletedWithGame, normalizeGameRecord } from "../src/lib/storage";
import type { GameRecord } from "../src/lib/types";

function oldGameRecord(): GameRecord {
  return {
    id: "game-a",
    title: "Game A",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    entryPath: "index.html",
    fileCount: 1,
    totalBytes: 10,
    settings: {
      reservedKeys: [],
      dictionaryDismissGuard: { enabled: false, triggers: [] },
      overlayEnabled: false,
      readableOverlay: false,
      readerMode: false,
    },
  };
}

describe("storage metadata helpers", () => {
  it("defaults old game records to stored source kind", () => {
    expect(normalizeGameRecord(oldGameRecord()).sourceKind).toBe("stored");
  });

  it("includes folder handles when deleting game metadata", () => {
    expect(gameStoreNamesDeletedWithGame()).toContain("handles");
  });
});
