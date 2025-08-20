export // 유틸리티 함수들
function parseCSV(text: string): string[] {
  return (text || "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
