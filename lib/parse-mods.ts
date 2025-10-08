export function parseModulesCSV(csv: unknown): number[] {
  if (Array.isArray(csv)) return csv.map((n) => Number(n)).filter(Number.isFinite)
  if (typeof csv !== "string") return []
  return csv
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
}
