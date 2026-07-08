import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  candidateFromDirectoryHandle,
  candidateFromFolder,
  candidateFromZip,
  importCandidate,
  importLocalFolderCandidate,
} from "../lib/importer";
import { normalizePlayerSettings } from "../lib/playerSettings";
import { downloadSaveZip } from "../lib/saveExport";
import { registerPlayerServiceWorker } from "../lib/serviceWorker";
import {
  deleteGame,
  estimateStorage,
  getAllGames,
  getLocalFolderHandle,
  updateGameSettings,
  type BrowserFileSystemDirectoryHandle,
} from "../lib/storage";
import type { GameRecord, ImportCandidate, ImportProgress } from "../lib/types";

export const idleProgress: ImportProgress = {
  phase: "idle",
  label: "",
  completed: 0,
  total: 0,
};

type ImportCandidateReader = () => Promise<ImportCandidate>;
type BrowserStorageImportSource = "folder" | "zip";
type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<BrowserFileSystemDirectoryHandle>;
};

function clearServiceWorkerGameCache(gameId: string) {
  navigator.serviceWorker.controller?.postMessage({
    type: "clear-game-cache",
    gameId,
  });
}

function supportsLocalFolderAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as WindowWithDirectoryPicker).showDirectoryPicker ===
      "function"
  );
}

function localFolderAccessError(): string | undefined {
  if (typeof window === "undefined")
    return "Folder access is not available in this browser.";
  if (!window.isSecureContext)
    return "Folder access requires HTTPS, localhost, or 127.0.0.1. Import a ZIP instead.";
  if (
    typeof (window as WindowWithDirectoryPicker).showDirectoryPicker !==
    "function"
  ) {
    return "Folder access is not available. Import a ZIP instead.";
  }
  return undefined;
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    globalThis.setTimeout(resolve, 0);
  });
}

async function requestLocalFolderPermission(gameId: string): Promise<boolean> {
  const handle = await getLocalFolderHandle(gameId);
  if (!handle) return false;

  const current = handle.queryPermission
    ? await handle.queryPermission({ mode: "read" })
    : "granted";
  if (current === "granted") return true;
  if (current === "denied" || !handle.requestPermission) return false;

  return (await handle.requestPermission({ mode: "read" })) === "granted";
}

async function availableBrowserStorage(): Promise<number | undefined> {
  const estimate = await estimateStorage();
  if (typeof estimate?.quota !== "number" || typeof estimate.usage !== "number")
    return undefined;
  return Math.max(0, estimate.quota - estimate.usage);
}

async function browserStorageError(
  requiredBytes: number,
  source: BrowserStorageImportSource,
): Promise<string | undefined> {
  const availableBytes = await availableBrowserStorage();
  if (availableBytes === undefined || requiredBytes <= availableBytes)
    return undefined;

  if (source === "folder") {
    return "Folder is too big to upload.";
  }

  return "ZIP is too big. Extract it and import the folder instead.";
}

export function useGameLibrary(onImportStart?: () => void) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress>(idleProgress);
  const [error, setError] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageEstimate | undefined>();

  const activeGame = useMemo(
    () => games.find((game) => game.id === activeGameId),
    [activeGameId, games],
  );

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    setError(null);
    try {
      await registerPlayerServiceWorker();
      await refreshGames();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start the browser player.",
      );
    }
  }

  async function refreshGames(nextActiveId?: string) {
    const nextGames = (await getAllGames()).map((game) => ({
      ...game,
      settings: normalizePlayerSettings(game.settings),
    }));
    setGames(nextGames);
    setStorage(await estimateStorage());
    if (nextActiveId) {
      setActiveGameId(nextActiveId);
    }
  }

  async function importFolder(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      event.target.value = "";
      setError("No files were selected.");
      return;
    }

    try {
      await runImport(async () => candidateFromFolder(files), "folder");
    } finally {
      event.target.value = "";
    }
  }

  async function openLocalFolder() {
    const supportError = localFolderAccessError();
    if (supportError) {
      setError(supportError);
      return;
    }

    setError(null);
    onImportStart?.();
    try {
      const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
      if (!picker)
        throw new Error("This browser cannot read folders directly.");

      setProgress({
        phase: "reading",
        label: "Choose a folder",
        completed: 0,
        total: 1,
      });
      const handle = await picker.call(window, {
        id: "game-folder",
        mode: "read",
      });
      setProgress({
        phase: "reading",
        label: "Scanning folder",
        completed: 0,
        total: 1,
      });
      await waitForNextPaint();
      const candidate = await candidateFromDirectoryHandle(handle, setProgress);
      const game = await importLocalFolderCandidate(candidate, setProgress);
      clearServiceWorkerGameCache(game.id);
      await refreshGames(game.id);
      setProgress(idleProgress);
    } catch (cause) {
      setProgress(idleProgress);
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Folder open failed.");
    }
  }

  async function importZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = "";
      return;
    }

    const compressedStorageError = await browserStorageError(file.size, "zip");
    if (compressedStorageError) {
      event.target.value = "";
      setError(compressedStorageError);
      return;
    }

    try {
      await runImport(async () => candidateFromZip(file, setProgress), "zip");
    } finally {
      event.target.value = "";
    }
  }

  async function runImport(
    readCandidate: ImportCandidateReader,
    source: BrowserStorageImportSource,
  ) {
    setError(null);
    onImportStart?.();
    try {
      setProgress({
        phase: "reading",
        label: "Reading files",
        completed: 0,
        total: 1,
      });
      await waitForNextPaint();
      const candidate = await readCandidate();
      const storageError = await browserStorageError(
        candidate.totalBytes,
        source,
      );
      if (storageError) throw new Error(storageError);
      const game = await importCandidate(candidate, setProgress);
      clearServiceWorkerGameCache(game.id);
      await refreshGames(game.id);
      setProgress(idleProgress);
    } catch (cause) {
      setProgress({
        phase: "error",
        label: "Import failed",
        completed: 0,
        total: 0,
      });
      setError(cause instanceof Error ? cause.message : "Import failed.");
    }
  }

  async function selectGame(gameId: string | null) {
    if (gameId === null) {
      setActiveGameId(null);
      return;
    }

    const game = games.find((item) => item.id === gameId);
    if (!game) return;

    setError(null);
    if ((game.sourceKind ?? "stored") === "local-folder") {
      try {
        if (!(await requestLocalFolderPermission(game.id))) {
          setError("Folder access expired. Open the folder again.");
          return;
        }
      } catch {
        setError("Folder access expired. Open the folder again.");
        return;
      }
    }

    setActiveGameId(gameId);
  }

  async function removeGame(game: GameRecord) {
    setError(null);
    await deleteGame(game.id);
    clearServiceWorkerGameCache(game.id);
    const remaining = games.filter((item) => item.id !== game.id);
    setGames(remaining);
    setActiveGameId(remaining[0]?.id ?? null);
    setStorage(await estimateStorage());
  }

  async function downloadSaves(game: GameRecord) {
    setError(null);
    try {
      await downloadSaveZip(game);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Save download failed.",
      );
    }
  }

  async function saveGameSettings(
    game: GameRecord,
    patch: Partial<GameRecord["settings"]>,
  ): Promise<GameRecord> {
    const updated: GameRecord = {
      ...game,
      settings: normalizePlayerSettings({ ...game.settings, ...patch }),
      updatedAt: new Date().toISOString(),
    };
    setGames((items) =>
      items.map((item) => (item.id === updated.id ? updated : item)),
    );
    await updateGameSettings(updated);
    clearServiceWorkerGameCache(updated.id);
    return updated;
  }

  return {
    activeGame,
    activeGameId,
    error,
    games,
    canUseLocalFolderAccess: supportsLocalFolderAccess(),
    importFolder,
    importZip,
    openLocalFolder,
    progress,
    downloadSaves,
    removeGame,
    saveGameSettings,
    setActiveGameId: selectGame,
    setError,
    storage,
  };
}
