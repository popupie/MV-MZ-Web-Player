import JSZip from "jszip";
import { defaultPlayerSettings } from "./defaults";
import { detectMime } from "./mime";
import { findEntryPath, normalizeStoredPath, stripCommonWrapper, titleFromEntry } from "./paths";
import { createOpfsWriter, putGame, putIndexedDbBlobs, putStoredFiles, supportsOpfs } from "./storage";
import type { GameRecord, ImportCandidate, ImportProgress } from "./types";

type ProgressCallback = (progress: ImportProgress) => void;
const PROGRESS_FILE_STEP = 25;
const IDB_BATCH_SIZE = 100;

function shouldReportProgress(index: number, total: number, lastReportTime: number): boolean {
  return index === total || index % PROGRESS_FILE_STEP === 0 || performance.now() - lastReportTime > 160;
}

export async function candidateFromFolder(files: FileList | File[]): Promise<ImportCandidate> {
  const entries = Array.from(files)
    .map((file) => ({
      path: normalizeStoredPath((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name),
      file
    }))
    .filter((entry) => entry.path);

  const normalized = stripCommonWrapper(entries);
  const paths = normalized.map((entry) => entry.path);

  return {
    title: titleFromEntry(entries.map((entry) => entry.path), "Imported Game"),
    files: normalized,
    entryPath: findEntryPath(paths),
    totalBytes: normalized.reduce((sum, entry) => sum + entry.file.size, 0)
  };
}

export async function candidateFromZip(file: File, onProgress?: ProgressCallback): Promise<ImportCandidate> {
  onProgress?.({ phase: "reading", label: "Reading ZIP", completed: 0, total: file.size });
  const zip = await JSZip.loadAsync(file);
  const zipEntries = Object.values(zip.files).filter((entry) => !entry.dir);
  const files: Array<{ path: string; file: Blob }> = [];
  let lastReportTime = performance.now();

  for (let index = 0; index < zipEntries.length; index += 1) {
    const entry = zipEntries[index];
    const blob = await entry.async("blob");
    const path = normalizeStoredPath(entry.name);
    files.push({
      path,
      file: new Blob([blob], { type: detectMime(path) })
    });
    if (shouldReportProgress(index + 1, zipEntries.length, lastReportTime)) {
      lastReportTime = performance.now();
      onProgress?.({ phase: "reading", label: "Reading ZIP", completed: index + 1, total: zipEntries.length });
    }
  }

  const normalized = stripCommonWrapper(files);
  const paths = normalized.map((entry) => entry.path);

  return {
    title: titleFromEntry(files.map((entry) => entry.path), file.name),
    files: normalized,
    entryPath: findEntryPath(paths),
    totalBytes: normalized.reduce((sum, entry) => sum + entry.file.size, 0)
  };
}

export async function importCandidate(candidate: ImportCandidate, onProgress?: ProgressCallback): Promise<GameRecord> {
  const gameId = crypto.randomUUID();
  const now = new Date().toISOString();
  const useOpfs = supportsOpfs();
  let totalBytes = 0;
  let lastReportTime = performance.now();

  onProgress?.({ phase: "storing", label: "Preparing browser storage", completed: 0, total: candidate.files.length });

  if (useOpfs) {
    const writer = await createOpfsWriter(gameId);
    const records = [];
    for (let index = 0; index < candidate.files.length; index += 1) {
      const entry = candidate.files[index];
      const record = await writer.putFile(entry.path, entry.file);
      records.push(record);
      totalBytes += entry.file.size;

      if (shouldReportProgress(index + 1, candidate.files.length, lastReportTime)) {
        lastReportTime = performance.now();
        onProgress?.({ phase: "storing", label: entry.path, completed: index + 1, total: candidate.files.length });
      }
    }
    await putStoredFiles(records);
  } else {
    for (let start = 0; start < candidate.files.length; start += IDB_BATCH_SIZE) {
      const batch = candidate.files.slice(start, start + IDB_BATCH_SIZE);
      await putIndexedDbBlobs(batch.map((entry) => ({ gameId, path: entry.path, blob: entry.file })));
      totalBytes += batch.reduce((sum, entry) => sum + entry.file.size, 0);

      const completed = Math.min(start + batch.length, candidate.files.length);
      onProgress?.({
        phase: "storing",
        label: batch[batch.length - 1]?.path ?? "Storing files",
        completed,
        total: candidate.files.length
      });
    }
  }

  const game: GameRecord = {
    id: gameId,
    title: candidate.title,
    createdAt: now,
    updatedAt: now,
    entryPath: candidate.entryPath,
    fileCount: candidate.files.length,
    totalBytes,
    settings: defaultPlayerSettings()
  };

  await putGame(game);
  onProgress?.({ phase: "done", label: "Imported", completed: candidate.files.length, total: candidate.files.length });
  return game;
}
