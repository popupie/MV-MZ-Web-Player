// @ts-nocheck
import { createCryptoRuntime } from "./desktop/crypto";
import { createFsRuntime } from "./desktop/fs";
import { createNwRuntime } from "./desktop/nw";
import { createProcessRuntime } from "./desktop/process";
import { createPathRuntime } from "./desktop/path";

(() => {
  const config = window.__MZ_PLAYER_DESKTOP_CONFIG;
  if (!config || typeof config !== "object") {
    throw new Error("MZ browser desktop runtime config did not load.");
  }
  const manifestUrlByRawReference = new Map();

  function addRawAssetReference(reference, url) {
    if (!reference || manifestUrlByRawReference.has(reference)) return;
    manifestUrlByRawReference.set(reference, url);
  }

  for (const file of config.files) {
    const rawPath = String(file.path).replace(/\\+/g, "/").replace(/^\/+/, "");
    const pathAliases = new Set([rawPath]);
    if (rawPath.toLowerCase().startsWith("www/")) {
      pathAliases.add(rawPath.slice(4));
    }

    for (const alias of pathAliases) {
      addRawAssetReference(alias, file.url);
      addRawAssetReference("./" + alias, file.url);
    }

    addRawAssetReference(config.fileRoutePrefix + rawPath, file.url);
  }

  function sanitizeMalformedPercentUrl(value) {
    if (typeof value !== "string") return value;
    return value.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
  }

  function canonicalManifestAssetUrl(value) {
    if (typeof value !== "string") return value;

    const origin = window.location.origin;
    const isSameOriginAbsolute = value.startsWith(origin + "/");
    const reference = isSameOriginAbsolute ? value.slice(origin.length) : value;
    const canonical = manifestUrlByRawReference.get(reference);
    if (!canonical) return value;
    return isSameOriginAbsolute ? origin + canonical : canonical;
  }

  function sanitizePlayerUrl(value) {
    return sanitizeMalformedPercentUrl(canonicalManifestAssetUrl(value));
  }

  function sanitizeRequestInput(input) {
    if (typeof input === "string") {
      return sanitizePlayerUrl(input);
    }
    if (typeof URL !== "undefined" && input instanceof URL) {
      const sanitized = sanitizePlayerUrl(input.href);
      return sanitized === input.href ? input : new URL(sanitized, input.href);
    }
    if (typeof Request !== "undefined" && input instanceof Request) {
      const sanitized = sanitizePlayerUrl(input.url);
      if (sanitized === input.url || input.bodyUsed) return input;
      try {
        return new Request(sanitized, input);
      } catch {
        return input;
      }
    }
    return input;
  }

  function installPlayerUrlPatch() {
    if (window.__mzPlayerUrlPatch) return;
    Object.defineProperty(window, "__mzPlayerUrlPatch", {
      value: true,
      configurable: false,
    });

    if (typeof XMLHttpRequest !== "undefined") {
      const open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        return open.apply(this, [method, sanitizeRequestInput(url)].concat(
          Array.prototype.slice.call(arguments, 2),
        ));
      };
    }

    if (typeof window.fetch === "function") {
      const fetch = window.fetch.bind(window);
      window.fetch = function(input, init) {
        return fetch(sanitizeRequestInput(input), init);
      };
    }

    function patchSrcSetter(prototype) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "src");
      if (!descriptor || typeof descriptor.set !== "function") return;
      Object.defineProperty(prototype, "src", {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set(value) {
          descriptor.set.call(this, sanitizePlayerUrl(String(value)));
        },
      });
    }

    if (typeof HTMLImageElement !== "undefined") {
      patchSrcSetter(HTMLImageElement.prototype);
    }
    if (typeof HTMLMediaElement !== "undefined") {
      patchSrcSetter(HTMLMediaElement.prototype);
    }
  }

  installPlayerUrlPatch();

  function isMzPlayerRequireResolutionError(error) {
    return (
      error instanceof Error &&
      (
        error.message.startsWith(
          "MZ browser player cannot provide Node module:",
        ) ||
        error.message.startsWith(
          "MZ browser player cannot resolve packaged module",
        )
      )
    );
  }

  function installGlobalRequireBridge(mzPlayerRequire) {
    let fallbackRequire =
      typeof window.require === "function" &&
      window.require !== mzPlayerRequire &&
      !window.require.__MzPlayerDesktopRequire
        ? window.require
        : null;

    function bridgedRequire(name) {
      try {
        return mzPlayerRequire.apply(this, arguments);
      } catch (error) {
        if (fallbackRequire && isMzPlayerRequireResolutionError(error)) {
          return fallbackRequire.apply(this, arguments);
        }
        throw error;
      }
    }

    Object.defineProperty(bridgedRequire, "__MzPlayerDesktopRequire", {
      value: true,
    });

    try {
      Object.defineProperty(window, "require", {
        configurable: true,
        get() {
          return bridgedRequire;
        },
        set(value) {
          if (value === bridgedRequire || value === mzPlayerRequire) return;
          if (typeof value === "function") fallbackRequire = value;
        },
      });
    } catch {
      window.require = bridgedRequire;
    }

    return bridgedRequire;
  }

  if (window.MzPlayerDesktop) {
    installGlobalRequireBridge(window.MzPlayerDesktop.require);
    return;
  }

  const pathRuntime = createPathRuntime(config);
  const {
    dirname,
    extname,
    joinPath,
    lookupManifestFile,
    manifestKey,
    normalizePath,
    pathModule,
  } = pathRuntime;

  const { clipboardShim, nwGuiModule, nwModule, windowShim } = createNwRuntime();

  function bytesToHex(bytes) {
    let output = "";
    for (const byte of bytes) {
      output += byte.toString(16).padStart(2, "0");
    }
    return output;
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(offset, Math.min(offset + 32768, bytes.length)),
      );
    }
    return window.btoa(binary);
  }

  const bufferModule = window.__MzPlayerBufferModule;
  const BrowserBuffer = bufferModule?.Buffer;
  if (!bufferModule || typeof BrowserBuffer?.from !== "function") {
    throw new Error("MZ Player browser Buffer runtime did not load.");
  }
  const browserCryptoModule = window.__MzPlayerCryptoModule;
  if (!browserCryptoModule || typeof browserCryptoModule !== "object") {
    throw new Error("MZ Player browser crypto runtime did not load.");
  }
  if (typeof window.Buffer !== "function") {
    Object.defineProperty(window, "Buffer", {
      configurable: true,
      value: BrowserBuffer,
      writable: true,
    });
  }

  function enhancedBytes(bytes) {
    return BrowserBuffer.from(bytes);
  }

  const fsRuntime = createFsRuntime({
    BrowserBuffer,
    bytesToBase64,
    bytesToHex,
    config,
    enhancedBytes,
    pathRuntime,
  });
  const { fsModule, readFileSync } = fsRuntime;

  const cryptoModule = createCryptoRuntime({
    browserCryptoModule,
    enhancedBytes,
  });

  const processModule = createProcessRuntime();
  const commonJsModuleCache = new Map();

  const modules = {
    path: pathModule,
    fs: fsModule,
    "nw.gui": nwGuiModule,
    nw: nwModule,
    crypto: cryptoModule,
    "node:crypto": cryptoModule,
    process: processModule,
    "node:process": processModule,
    buffer: bufferModule,
    "node:buffer": bufferModule,
  };

  function resolvePackagedModule(name, parentFilename) {
    const request = String(name).replace(/\\+/g, "/");
    let candidate;
    if (request.startsWith("/")) {
      candidate = normalizePath(request);
    } else if (request.startsWith("./") || request.startsWith("../")) {
      candidate = normalizePath(joinPath(dirname(parentFilename), request));
    } else {
      candidate = normalizePath(request);
    }

    const candidates = [candidate];
    if (!extname(candidate)) {
      candidates.push(candidate + ".js", candidate + ".json");
      candidates.push(joinPath(candidate, "index.js"), joinPath(candidate, "index.json"));
    }
    for (const path of candidates) {
      const file = lookupManifestFile(path);
      if (file) return file;
    }
    return null;
  }

  function loadPackagedModule(name, parentFilename, resolvedFile) {
    const manifestFile =
      resolvedFile ?? resolvePackagedModule(name, parentFilename);
    if (!manifestFile) {
      throw new Error(
        "MZ browser player cannot resolve packaged module '" +
          name +
          "' from '" +
          parentFilename +
          "'.",
      );
    }
    const filename = "/" + manifestKey(manifestFile.path);
    const cacheKey = manifestFile.path;
    if (commonJsModuleCache.has(cacheKey)) {
      return commonJsModuleCache.get(cacheKey).exports;
    }

    const module = {
      exports: {},
      filename,
      id: filename,
      loaded: false,
    };
    commonJsModuleCache.set(cacheKey, module);

    try {
      const source = readFileSync(filename, "utf8");
      if (extname(filename).toLowerCase() === ".json") {
        module.exports = JSON.parse(source);
      } else {
        const localRequire = function localRequire(request) {
          return mzPlayerRequire(request, filename);
        };
        localRequire.resolve = function resolve(request) {
          const builtin = String(request);
          if (Object.prototype.hasOwnProperty.call(modules, builtin)) return builtin;
          const file = resolvePackagedModule(request, filename);
          if (!file) {
            throw new Error(
              "MZ browser player cannot resolve packaged module '" +
                request +
                "' from '" +
                filename +
                "'.",
            );
          }
          return "/" + manifestKey(file.path);
        };
        const factory = new Function(
          "exports",
          "require",
          "module",
          "__filename",
          "__dirname",
          "Buffer",
          source + "\n//# sourceURL=" + filename,
        );
        factory(
          module.exports,
          localRequire,
          module,
          filename,
          dirname(filename),
          BrowserBuffer,
        );
      }
      module.loaded = true;
      return module.exports;
    } catch (error) {
      commonJsModuleCache.delete(cacheKey);
      throw error;
    }
  }

  function mzPlayerRequire(name, parentFilename = "/www/index.html") {
    const key = String(name);
    if (Object.prototype.hasOwnProperty.call(modules, key)) {
      return modules[key];
    }
    const manifestFile = resolvePackagedModule(key, parentFilename);
    if (manifestFile) {
      return loadPackagedModule(key, parentFilename, manifestFile);
    }
    throw new Error("MZ browser player cannot provide Node module: " + key);
  }

  const requireBridge = installGlobalRequireBridge(mzPlayerRequire);
  nwModule.require = requireBridge;
  nwGuiModule.require = requireBridge;

  window.MzPlayerDesktop = Object.freeze({
    version: 1,
    capabilities: Object.freeze([
      "fs.virtualSync",
      "fs.manifestRead",
      "fs.manifestSyncRead",
      "fs.manifestMetadata",
      "path.posix",
      "nw.gui.noop",
      "nw.windowOpen.currentFrame",
      "nw.globalNoop",
      "crypto.webRandom",
      "crypto.nodeCiphers",
      "process.browserCompat",
      "modules.manifestCommonJS",
      "buffer.commonJS",
      "buffer.global",
    ]),
    entryId: config.entryId,
    fs: fsModule,
    path: pathModule,
    crypto: cryptoModule,
    process: processModule,
    Buffer: BrowserBuffer,
    nw: nwModule,
    window: windowShim,
    clipboard: clipboardShim,
    require: requireBridge,
  });

  function installRpgMakerLoadGameAliasRescue() {
    if (typeof window._Data_Manager_loadGame === "function") return;
    Object.defineProperty(window, "_Data_Manager_loadGame", {
      configurable: true,
      writable: true,
      value: function MzPlayerLoadGameAliasRescue(savefileId) {
        const manager =
          this && typeof this.loadGameWithoutRescue === "function"
            ? this
            : window.DataManager;
        if (manager && typeof manager.loadGameWithoutRescue === "function") {
          try {
            return manager.loadGameWithoutRescue(savefileId);
          } catch (error) {
            console.error(error);
            return false;
          }
        }
        console.warn(
          "[MZ Player RPG Maker rescue] _Data_Manager_loadGame was called before DataManager.loadGameWithoutRescue existed.",
        );
        return false;
      },
    });
  }

  installRpgMakerLoadGameAliasRescue();

  console.info("[MZ browser desktop API]", {
    entryId: config.entryId,
    modules: Object.keys(modules),
  });
})();
