// @ts-nocheck

export function createPathRuntime(config) {
  const manifestFileByKey = new Map();
  const manifestDirs = new Set();

  function normalizePath(value) {
    const raw = String(value ?? "").replace(/\\+/g, "/");
    const hasLeadingSlash = raw.startsWith("/");
    const parts = [];
    for (const part of raw.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") {
        parts.pop();
        continue;
      }
      parts.push(part);
    }
    const normalized = parts.join("/");
    return hasLeadingSlash ? "/" + normalized : normalized || ".";
  }

  function manifestKey(value) {
    let normalized = normalizePath(value);
    if (normalized === ".") return "";
    normalized = normalized.replace(/^\/+/, "");
    while (normalized.startsWith("./")) {
      normalized = normalized.slice(2);
    }
    return normalized;
  }

  function manifestAliases(value) {
    const key = manifestKey(value);
    const aliases = new Set();
    if (key) aliases.add(key);
    if (key) {
      let withoutWebRoot = key;
      while (withoutWebRoot.toLowerCase().startsWith("www/")) {
        withoutWebRoot = withoutWebRoot.slice(4);
        if (withoutWebRoot) aliases.add(withoutWebRoot);
      }
      if (withoutWebRoot) aliases.add("www/" + withoutWebRoot);
    }
    return Array.from(aliases).filter(Boolean);
  }

  function addManifestDirAliases(value) {
    for (const alias of manifestAliases(value)) {
      let current = alias.includes("/") ? alias.slice(0, alias.lastIndexOf("/")) : "";
      while (current) {
        manifestDirs.add(current);
        if (current.toLowerCase().startsWith("www/")) {
          manifestDirs.add(current.slice(4));
        }
        const index = current.lastIndexOf("/");
        current = index < 0 ? "" : current.slice(0, index);
      }
    }
  }

  for (const file of config.files) {
    for (const alias of manifestAliases(file.path)) {
      manifestFileByKey.set(alias, file);
      manifestFileByKey.set(alias.toLowerCase(), file);
    }
    addManifestDirAliases(file.path);
  }

  function trimTrailingSlash(value) {
    return value.length > 1 ? value.replace(/\/+$/, "") : value;
  }

  function dirname(value) {
    const normalized = trimTrailingSlash(normalizePath(value));
    if (normalized === "." || normalized === "/") return normalized;
    const index = normalized.lastIndexOf("/");
    if (index < 0) return ".";
    if (index === 0) return "/";
    return normalized.slice(0, index);
  }

  function basename(value, ext) {
    const normalized = trimTrailingSlash(normalizePath(value));
    const index = normalized.lastIndexOf("/");
    const base = index < 0 ? normalized : normalized.slice(index + 1);
    return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
  }

  function extname(value) {
    const base = basename(value);
    const index = base.lastIndexOf(".");
    return index > 0 ? base.slice(index) : "";
  }

  function joinPath() {
    return normalizePath(Array.from(arguments).filter(Boolean).join("/"));
  }

  function lookupManifestFile(path) {
    for (const alias of manifestAliases(path)) {
      const exact = manifestFileByKey.get(alias);
      if (exact) return exact;
      const lower = manifestFileByKey.get(alias.toLowerCase());
      if (lower) return lower;
    }
    return null;
  }

  function manifestDirExists(path) {
    if (!manifestKey(path)) return config.files.length > 0;
    for (const alias of manifestAliases(path)) {
      if (manifestDirs.has(alias) || manifestDirs.has(alias.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  const pathModule = {
    sep: "/",
    delimiter: ":",
    join: joinPath,
    normalize: normalizePath,
    dirname,
    basename,
    extname,
    resolve: function resolve() {
      return normalizePath(joinPath.apply(null, arguments));
    },
  };

  return {
    basename,
    dirname,
    extname,
    joinPath,
    lookupManifestFile,
    manifestAliases,
    manifestDirExists,
    manifestKey,
    normalizePath,
    pathModule,
    trimTrailingSlash,
  };
}
