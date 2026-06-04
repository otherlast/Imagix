// Tamaños reales en milímetros (impresión)
export const SHEET_SIZES = {
  letter: { id: "letter", label: "Carta", widthMm: 215.9, heightMm: 279.4 },
  legal: { id: "legal", label: "Oficio", widthMm: 215.9, heightMm: 355.6 },
};

export const DEFAULT_MARGIN_MM = 6;

// 300 DPI export (1 inch = 25.4 mm => 11.811 px/mm)
export const EXPORT_PX_PER_MM = 11.811;

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function sheetDimsMm(sizeId, orientation) {
  const s = SHEET_SIZES[sizeId] || SHEET_SIZES.letter;
  if (orientation === "landscape") {
    return { widthMm: s.heightMm, heightMm: s.widthMm };
  }
  return { widthMm: s.widthMm, heightMm: s.heightMm };
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
