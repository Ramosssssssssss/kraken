/**
 * Parsea una cadena CSV de módulos en un array
 * @param modulesCSV - Cadena CSV de módulos (ej: "MOD1,MOD2,MOD3")
 * @returns Array de módulos o array vacío si no hay módulos
 */
export function parseModulesCSV(modulesCSV: string | null | undefined): string[] {
  if (!modulesCSV || typeof modulesCSV !== "string") {
    return []
  }

  return modulesCSV
    .split(",")
    .map((mod) => mod.trim())
    .filter((mod) => mod.length > 0)
}
