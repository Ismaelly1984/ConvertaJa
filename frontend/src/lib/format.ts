export function formatBytes(bytes: number): string {
  const units = ['B','KB','MB','GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length-1) { v /= 1024; i++ }
  return `${v.toFixed(1)} ${units[i]}`
}

