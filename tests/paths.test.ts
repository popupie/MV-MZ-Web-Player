import { describe, expect, it } from "vitest";
import { findEntryPath, findPathRecord, mojibakePathAliases, normalizeStoredPath, stripCommonWrapper, titleFromEntry } from "../src/lib/paths";

describe("path helpers", () => {
  it("normalizes separators and removes traversal", () => {
    expect(normalizeStoredPath("\\Game//www/../index.html")).toBe("Game/index.html");
    expect(normalizeStoredPath("/Game/./www/index.html")).toBe("Game/www/index.html");
    expect(normalizeStoredPath("/Game/WWW/Index.HTML")).toBe("Game/WWW/Index.HTML");
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

  it("finds stored paths with exact match before case-insensitive fallback", () => {
    const exact = { path: "www/js/plugins/YEP_X_VisualHpGauge.js" };
    const caseMatch = { path: "www/js/plugins/YEP_X_VisualHPGauge.js" };

    expect(findPathRecord([exact, caseMatch], "www/js/plugins/YEP_X_VisualHpGauge.js")).toBe(exact);
    expect(findPathRecord([caseMatch], "www/js/plugins/YEP_X_VisualHpGauge.js")).toBe(caseMatch);
  });

  it("recovers common Japanese mojibake path aliases", () => {
    const samples = [
      ["www/img/pictures/■制作・クレジット.txt", "www/img/pictures/üíÉºì∞üEâNâîâWâbâg.txt"],
      ["www/img/pictures/a_地図1.rpgmvp", "www/img/pictures/a_ÆnÉ}1.rpgmvp"],
      ["www/img/pictures/AAA_説明14.rpgmvp", "www/img/pictures/AAA_Éαû╛14.rpgmvp"],
      ["www/img/pictures/アイテム_杖.rpgmvp", "www/img/pictures/âAâCâeâÇ_Å±.rpgmvp"]
    ];

    for (const [requestedPath, storedPath] of samples) {
      const record = { path: storedPath };
      expect(mojibakePathAliases(storedPath)).toContain(requestedPath);
      expect(findPathRecord([record], requestedPath)).toBe(record);
    }
  });

  it("keeps exact paths ahead of mojibake aliases", () => {
    const exact = { path: "www/img/pictures/AAA_説明14.rpgmvp" };
    const mojibake = { path: "www/img/pictures/AAA_Éαû╛14.rpgmvp" };

    expect(findPathRecord([exact, mojibake], "www/img/pictures/AAA_説明14.rpgmvp")).toBe(exact);
  });

  it("does not alias encrypted and plain RPG Maker asset extensions", () => {
    expect(findPathRecord([{ path: "www/img/pictures/Hero.rpgmvp" }], "www/img/pictures/Hero.png")).toBeUndefined();
    expect(findPathRecord([{ path: "www/audio/bgm/Theme.ogg" }], "www/audio/bgm/Theme.rpgmvo")).toBeUndefined();
  });
});
