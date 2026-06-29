import type { DictionaryDismissGuard, GameRecord } from "./types";

export const defaultDictionaryDismissGuard: DictionaryDismissGuard = {
  enabled: true,
  triggers: [{ ctrlKey: true, label: "Ctrl" }],
};

export function overlayTogglePatch(game: GameRecord): Partial<GameRecord["settings"]> {
  if (game.settings.overlayEnabled) {
    return {
      overlayEnabled: false,
      readableOverlay: false,
      readerMode: false,
    };
  }
  return { overlayEnabled: true, readableOverlay: false, readerMode: true };
}

export function showTogglePatch(game: GameRecord): Partial<GameRecord["settings"]> {
  if (!game.settings.overlayEnabled) {
    return {
      overlayEnabled: false,
      readableOverlay: false,
      readerMode: false,
    };
  }
  return {
    overlayEnabled: true,
    readableOverlay: !Boolean(game.settings.readableOverlay),
    readerMode: true,
  };
}

export function dictionaryGuardFor(game: GameRecord): DictionaryDismissGuard {
  const guard = game.settings.dictionaryDismissGuard;
  return {
    enabled: guard?.enabled ?? defaultDictionaryDismissGuard.enabled,
    triggers: guard?.triggers?.length ? guard.triggers : defaultDictionaryDismissGuard.triggers,
  };
}
