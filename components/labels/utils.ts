// src/lib/labels/utils.ts
export const MAX_W_MM = 135;
export const MAX_H_MM = 300;

// ~96dpi aprox para preview
export const mmToPx = (mm: number) => Math.max(1, Math.round(mm * 3.78));
export const clampMm = (mm: number, max: number) =>
  Number.isFinite(mm) ? Math.max(1, Math.min(max, mm)) : 1;

export const clampBarHeight = (barMm: number, labelH: number, marginMm: number) => {
  const maxBar = Math.max(4, labelH - marginMm * 2 - 4);
  return clampMm(barMm, maxBar);
};

export const normalizeCode = (s: string) =>
  String(s ?? "")
    .replace(/[\u2010-\u2015\u2212]/g, "-") // guiones Unicode → ASCII
    .replace(/[’'`]/g, "-")                 // apóstrofos → guion
    .replace(/\s+/g, " ")
    .trim();

export const isMobileUA = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export type LabelConfig = {
  size: "custom";
  margin: string;
  width: string;
  height: string;
  text: string;
  fontSize: string;
  font: string;
  quantity: string;
  barHeightMm: string;
  qrSizeMm: string;
};
