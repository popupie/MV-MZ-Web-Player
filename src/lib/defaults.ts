import type { PlayerSettings } from "./types";
import { defaultDictionaryDismissGuard, defaultReservedKeys } from "./playerSettings";

export const defaultPlayerSettings = (): PlayerSettings => ({
  overlayEnabled: false,
  readableOverlay: false,
  readerMode: false,
  dictionaryDismissGuard: {
    ...defaultDictionaryDismissGuard,
    triggers: defaultDictionaryDismissGuard.triggers.map((trigger) => ({ ...trigger })),
  },
  reservedKeys: defaultReservedKeys.map((key) => ({ ...key })),
});
