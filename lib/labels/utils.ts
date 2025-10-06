// lib/labels/utils.ts
export const mmToPx = (mm: number) => Math.max(1, Math.round(mm * 3.78))
export const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })
    .format(Number.isFinite(n) ? n : 0)

export function escapeHTML(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string))
}
