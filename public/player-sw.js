const DB_NAME = "mvmz-browser-player";
const DB_VERSION = 1;
const GAME_STORE = "games";
const FILE_STORE = "files";
const BLOB_STORE = "blobs";
let dbPromise;
const gameCache = new Map();
const fileCache = new Map();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/play/"))
    return;

  event.respondWith(serveGameFile(url, event.request));
});

self.addEventListener("message", (event) => {
  if (
    event.data &&
    event.data.type === "clear-game-cache" &&
    event.data.gameId
  ) {
    gameCache.delete(event.data.gameId);
    fileCache.delete(event.data.gameId);
    return;
  }
  if (event.data && event.data.type === "clear-cache") {
    gameCache.clear();
    fileCache.clear();
  }
});

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(GAME_STORE))
        db.createObjectStore(GAME_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        const store = db.createObjectStore(FILE_STORE, { keyPath: "key" });
        store.createIndex("gameId", "gameId", { unique: false });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE))
        db.createObjectStore(BLOB_STORE, { keyPath: "key" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = undefined;
        gameCache.clear();
        fileCache.clear();
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = undefined;
      reject(request.error || new Error("IndexedDB open failed."));
    };
  });

  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB request failed."));
  });
}

function normalizePath(path) {
  const parts = [];
  for (const rawPart of path
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .split("/")) {
    const part = rawPart.trim();
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

async function getGame(gameId) {
  if (gameCache.has(gameId)) return gameCache.get(gameId);

  const db = await openDb();
  const game = await requestToPromise(
    db.transaction(GAME_STORE, "readonly").objectStore(GAME_STORE).get(gameId),
  );
  gameCache.set(gameId, game);
  return game;
}

async function getGameFileMap(gameId) {
  const cached = fileCache.get(gameId);
  if (cached) return cached;

  const db = await openDb();
  const records = await requestToPromise(
    db
      .transaction(FILE_STORE, "readonly")
      .objectStore(FILE_STORE)
      .index("gameId")
      .getAll(IDBKeyRange.only(gameId)),
  );
  const map = new Map();
  for (const record of records) {
    map.set(normalizePath(record.path), record);
  }
  fileCache.set(gameId, map);
  return map;
}

async function getStoredFile(gameId, path) {
  return (await getGameFileMap(gameId)).get(normalizePath(path));
}

async function getIndexedDbBlob(storageRef) {
  const db = await openDb();
  const record = await requestToPromise(
    db
      .transaction(BLOB_STORE, "readonly")
      .objectStore(BLOB_STORE)
      .get(storageRef),
  );
  return record && record.blob;
}

async function getOpfsBlob(gameId, path) {
  try {
    if (!navigator.storage || !navigator.storage.getDirectory) return undefined;
    const parts = normalizePath(path).split("/");
    const name = parts.pop();
    if (!name) return undefined;
    let dir = await navigator.storage.getDirectory();
    dir = await dir.getDirectoryHandle("games");
    dir = await dir.getDirectoryHandle(gameId);
    for (const part of parts) dir = await dir.getDirectoryHandle(part);
    const handle = await dir.getFileHandle(name);
    return await handle.getFile();
  } catch {
    return undefined;
  }
}

async function serveGameFile(url, request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const gameId = decodeURIComponent(parts[1] || "");
  const requestedPath = normalizePath(
    parts.slice(2).map(decodeURIComponent).join("/"),
  );
  const game = gameId ? await getGame(gameId) : undefined;
  if (!game) return new Response("Game not found", { status: 404 });

  const path = requestedPath || game.entryPath || "index.html";
  const record = await getStoredFile(gameId, path);
  if (!record) return new Response("File not found", { status: 404 });

  const blob =
    record.storageKind === "opfs"
      ? await getOpfsBlob(gameId, record.path)
      : await getIndexedDbBlob(record.storageRef);
  if (!blob) return new Response("File body not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": record.mime || blob.type || "application/octet-stream",
    "Cache-Control": "no-store",
  });

  if (request.method === "HEAD")
    return new Response(null, { status: 200, headers });

  if ((record.mime || "").startsWith("text/html")) {
    const html = await blob.text();
    return new Response(injectBridge(html, game), { status: 200, headers });
  }

  return new Response(blob, { status: 200, headers });
}

function injectBridge(html, game) {
  const config = `<script>window.__MZ_PLAYER_BRIDGE__=${JSON.stringify({
    gameId: game.id,
    settings: game.settings,
  }).replace(
    /</g,
    "\\u003c",
  )};</script><script src="/runtime-bridge.js"></script>`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${config}`);
  }
  return `${config}${html}`;
}
