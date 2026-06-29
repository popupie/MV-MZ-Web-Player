import { describe, expect, it } from "vitest";
import { decodeZipFileName } from "../src/lib/importer";

describe("ZIP filename decoding", () => {
  it("decodes UTF-8 names", () => {
    const bytes = new TextEncoder().encode("www/img/pictures/説明14.rpgmvp");

    expect(decodeZipFileName(bytes)).toBe("www/img/pictures/説明14.rpgmvp");
  });

  it("falls back to Shift_JIS names", () => {
    const bytes = new Uint8Array([
      119, 119, 119, 47, 105, 109, 103, 47, 112, 105, 99, 116, 117, 114, 101, 115, 47, 144, 224, 150, 190, 49, 52,
      46, 114, 112, 103, 109, 118, 112
    ]);

    expect(decodeZipFileName(bytes)).toBe("www/img/pictures/説明14.rpgmvp");
  });
});
