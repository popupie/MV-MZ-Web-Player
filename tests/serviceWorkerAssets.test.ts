import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

function loadServiceWorkerHelpers() {
  const context = vm.createContext({
    Blob,
    Response,
    TextDecoder,
    URL,
    Uint8Array,
    indexedDB: {},
    navigator: { storage: {} },
    self: {
      addEventListener() {
        return undefined;
      },
      clients: {
        claim() {
          return undefined;
        },
        matchAll() {
          return [];
        },
      },
      location: { origin: "http://player.test" },
      skipWaiting() {
        return undefined;
      },
    },
  });
  const source = readFileSync(resolve("public/player-sw.js"), "utf8");
  vm.runInContext(source, context);
  return context as any;
}

describe("service worker RPG Maker asset helpers", () => {
  it("detects plain/encrypted audio fallback directions", () => {
    const helpers = loadServiceWorkerHelpers();

    expect(helpers.encryptedRequestPlainFallbackExtension("www/audio/bgm/theme.rpgmvo", "www/audio/bgm/theme.ogg")).toBe(".ogg");
    expect(helpers.encryptedRequestPlainFallbackExtension("www/audio/bgm/theme.rpgmvo__", "www/audio/bgm/theme.ogg_")).toBe(".ogg");
    expect(helpers.encryptedRequestPlainFallbackExtension("www/audio/se/click.rpgmvm", "www/audio/se/click.m4a")).toBe(".m4a");
    expect(helpers.plainRequestEncryptedFallbackMime("www/audio/bgm/theme.ogg", "www/audio/bgm/theme.rpgmvo")).toBe("audio/ogg");
    expect(helpers.plainRequestEncryptedFallbackMime("www/audio/bgm/theme.ogg_", "www/audio/bgm/theme.rpgmvo___")).toBe("audio/ogg");
    expect(helpers.plainRequestEncryptedFallbackMime("www/audio/se/click.m4a", "www/audio/se/click.rpgmvm")).toBe("audio/mp4");
  });

  it("aliases video assets without treating them as encrypted audio", () => {
    const helpers = loadServiceWorkerHelpers();

    expect(helpers.rpgMakerAssetPathAliases("www/movies/opening.webm_")).toContain("www/movies/opening.mp4");
    expect(helpers.rpgMakerAssetPathAliases("www/movies/opening.mp4__")).toContain("www/movies/opening.webm");
    expect(helpers.encryptedRequestPlainFallbackExtension("www/movies/opening.webm_", "www/movies/opening.webm")).toBe(null);
    expect(helpers.plainRequestEncryptedFallbackMime("www/movies/opening.webm", "www/movies/opening.mp4_")).toBe(undefined);
  });

  it("round-trips RPG Maker encrypted asset bytes with a System.json key", () => {
    const helpers = loadServiceWorkerHelpers();
    const plainBytes = Uint8Array.from([0x4f, 0x67, 0x67, 0x53, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    const key = Uint8Array.from([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]);

    const encrypted = helpers.encryptRpgMakerAsset(plainBytes, key);
    expect(encrypted.slice(0, 5)).toEqual(Uint8Array.from([0x52, 0x50, 0x47, 0x4d, 0x56]));
    expect(encrypted.slice(16, 32)).not.toEqual(plainBytes.slice(0, 16));
    expect(helpers.decryptRpgMakerAsset(encrypted, key)).toEqual(plainBytes);
  });
});
