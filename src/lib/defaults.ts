import type { PlayerSettings } from "./types";

export const defaultPlayerSettings = (): PlayerSettings => ({
  overlayEnabled: false,
  readableOverlay: false,
  readerMode: false,
  dictionaryDismissGuard: {
    enabled: true,
    triggers: [
      {
        ctrlKey: true,
        label: "Ctrl"
      }
    ]
  },
  reservedKeys: [
    {
      code: "KeyT",
      altKey: true,
      action: "toggleOverlay",
      label: "Alt+T"
    },
    {
      code: "KeyR",
      altKey: true,
      action: "toggleReader",
      label: "Alt+R"
    },
    {
      code: "KeyF",
      altKey: true,
      action: "fullscreen",
      label: "Alt+F"
    }
  ]
});
