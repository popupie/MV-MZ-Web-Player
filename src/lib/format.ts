export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = units.shift()!;
  while (size >= 1024 && units.length > 0) {
    size /= 1024;
    unit = units.shift()!;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${unit}`;
}
