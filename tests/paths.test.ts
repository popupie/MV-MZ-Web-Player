import { describe, expect, it } from "vitest";
import { findEntryPath, normalizeStoredPath, stripCommonWrapper, titleFromEntry } from "../src/lib/paths";

describe("path helpers", () => {
  it("normalizes separators and removes traversal", () => {
    expect(normalizeStoredPath("\\Game//www/../index.html")).toBe("Game/index.html");
    expect(normalizeStoredPath("/Game/./www/index.html")).toBe("Game/www/index.html");
  });

  it("strips a common archive wrapper when it contains an entrypoint", () => {
    const stripped = stripCommonWrapper([
      { path: "Wrapped/index.html" },
      { path: "Wrapped/js/main.js" }
    ]);

    expect(stripped.map((entry) => entry.path)).toEqual(["index.html", "js/main.js"]);
  });

  it("finds root or www entrypoints", () => {
    expect(findEntryPath(["data/Actors.json", "www/index.html"])).toBe("www/index.html");
    expect(findEntryPath(["index.html", "www/index.html"])).toBe("index.html");
  });

  it("creates a stable title from paths or filename fallback", () => {
    expect(titleFromEntry(["Game/index.html", "Game/js/main.js"], "archive.zip")).toBe("Game");
    expect(titleFromEntry(["index.html"], "archive.zip")).toBe("archive");
  });

});
