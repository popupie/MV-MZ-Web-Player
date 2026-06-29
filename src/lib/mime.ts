const mimeByExtension = new Map<string, string>([
  ["html", "text/html; charset=utf-8"],
  ["htm", "text/html; charset=utf-8"],
  ["js", "text/javascript; charset=utf-8"],
  ["mjs", "text/javascript; charset=utf-8"],
  ["json", "application/json; charset=utf-8"],
  ["css", "text/css; charset=utf-8"],
  ["txt", "text/plain; charset=utf-8"],
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["gif", "image/gif"],
  ["webp", "image/webp"],
  ["svg", "image/svg+xml"],
  ["ico", "image/x-icon"],
  ["ogg", "audio/ogg"],
  ["oga", "audio/ogg"],
  ["mp3", "audio/mpeg"],
  ["m4a", "audio/mp4"],
  ["wav", "audio/wav"],
  ["webm", "video/webm"],
  ["mp4", "video/mp4"],
  ["ttf", "font/ttf"],
  ["otf", "font/otf"],
  ["woff", "font/woff"],
  ["woff2", "font/woff2"],
  ["rpgmvp", "image/png"],
  ["rpgmvm", "audio/ogg"],
  ["rpgmvo", "audio/ogg"],
  ["rpgsave", "application/octet-stream"],
  ["rmmzsave", "application/octet-stream"]
]);

export function detectMime(path: string): string {
  const cleanPath = path.split("?")[0].split("#")[0];
  const extension = cleanPath.includes(".") ? cleanPath.split(".").pop()?.toLowerCase() : "";
  return (extension && mimeByExtension.get(extension)) || "application/octet-stream";
}
