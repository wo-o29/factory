export function formatDateTime(date: Date): string {
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}.000000`;
}
