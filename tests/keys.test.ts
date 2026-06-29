import { describe, expect, it } from "vitest";
import { defaultPlayerSettings } from "../src/lib/defaults";
import { matchesReservedKey, namespaceStorageKey, reservedKeyForEvent, unnamespaceStorageKey } from "../src/lib/keys";

describe("reserved keys", () => {
  it("defaults dictionary dismissal to Ctrl", () => {
    const guard = defaultPlayerSettings().dictionaryDismissGuard;
    expect(guard.enabled).toBe(true);
    expect(guard.triggers).toEqual([{ ctrlKey: true, label: "Ctrl" }]);
  });

  it("matches exact modifier state", () => {
    const key = defaultPlayerSettings().reservedKeys[0];
    expect(matchesReservedKey({ code: "KeyT", altKey: true, ctrlKey: false, metaKey: false, shiftKey: false }, key)).toBe(true);
    expect(matchesReservedKey({ code: "KeyT", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }, key)).toBe(false);
  });

  it("finds the configured action", () => {
    const settings = defaultPlayerSettings();
    expect(reservedKeyForEvent({ code: "KeyR", altKey: true, ctrlKey: false, metaKey: false, shiftKey: false }, settings)?.action).toBe("toggleReader");
  });
});

describe("localStorage namespacing", () => {
  it("separates RPG Maker keys per game", () => {
    expect(namespaceStorageKey("game-a", "RPG File1")).toBe("mz-player:game-a:RPG File1");
    expect(namespaceStorageKey("game-b", "RPG File1")).toBe("mz-player:game-b:RPG File1");
  });

  it("does not double namespace and can remove a namespace", () => {
    const key = namespaceStorageKey("game-a", "RPG Global");
    expect(namespaceStorageKey("game-a", key)).toBe(key);
    expect(unnamespaceStorageKey("game-a", key)).toBe("RPG Global");
  });
});
