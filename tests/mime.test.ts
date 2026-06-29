import { describe, expect, it } from "vitest";
import { detectMime } from "../src/lib/mime";

describe("detectMime", () => {
  it("detects common RPG Maker web assets", () => {
    expect(detectMime("index.html")).toContain("text/html");
    expect(detectMime("js/rpg_core.js")).toContain("text/javascript");
    expect(detectMime("data/System.json")).toContain("application/json");
    expect(detectMime("img/pictures/title.rpgmvp")).toBe("image/png");
    expect(detectMime("audio/bgm/theme.rpgmvo")).toBe("audio/ogg");
  });

  it("falls back to bytes for unknown files", () => {
    expect(detectMime("save/file1.bin")).toBe("application/octet-stream");
  });
});
