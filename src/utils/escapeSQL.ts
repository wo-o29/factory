export function escapeSQL(str = ""): string {
  return String(str).replaceAll("'", "''");
}
