import { sheetDimsMm, uid } from "./sheet";

// Devuelve placements en coordenadas porcentaje (0-100) relativas a la hoja
// {xPct, yPct, wPct, hPct}
function gridCells(rows, cols, marginPct, gapPct) {
  const usableW = 100 - marginPct * 2;
  const usableH = 100 - marginPct * 2;
  const totalGapW = gapPct * (cols - 1);
  const totalGapH = gapPct * (rows - 1);
  const cellW = (usableW - totalGapW) / cols;
  const cellH = (usableH - totalGapH) / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        xPct: marginPct + c * (cellW + gapPct),
        yPct: marginPct + r * (cellH + gapPct),
        wPct: cellW,
        hPct: cellH,
      });
    }
  }
  return cells;
}

export function computeAutoFit(n) {
  if (n <= 1) return { rows: 1, cols: 1 };
  if (n <= 2) return { rows: 2, cols: 1 };
  if (n <= 4) return { rows: 2, cols: 2 };
  if (n <= 6) return { rows: 3, cols: 2 };
  if (n <= 9) return { rows: 3, cols: 3 };
  if (n <= 12) return { rows: 4, cols: 3 };
  if (n <= 16) return { rows: 4, cols: 4 };
  if (n <= 20) return { rows: 5, cols: 4 };
  if (n <= 25) return { rows: 5, cols: 5 };
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { rows, cols };
}

// Devuelve { cellsPerPage, makePlacement(cell) } para un preset dado.
function getPresetSpec(preset, opts) {
  const { widthMm, heightMm, paper, marginPct, gapPct, totalImages } = opts;
  if (preset === "full") {
    // Una imagen por hoja, ocupando toda la zona útil
    return {
      cells: [
        {
          xPct: marginPct,
          yPct: marginPct,
          wPct: 100 - marginPct * 2,
          hPct: 100 - marginPct * 2,
        },
      ],
      fit: "contain",
    };
  }
  if (preset === "half") {
    const isLandscape = paper.orientation === "landscape";
    return {
      cells: isLandscape
        ? gridCells(1, 2, marginPct, gapPct)
        : gridCells(2, 1, marginPct, gapPct),
      fit: "contain",
    };
  }
  if (preset === "2x2")
    return { cells: gridCells(2, 2, marginPct, gapPct), fit: "contain" };
  if (preset === "3x3")
    return { cells: gridCells(3, 3, marginPct, gapPct), fit: "contain" };
  if (preset === "4x4")
    return { cells: gridCells(4, 4, marginPct, gapPct), fit: "contain" };
  if (preset === "auto") {
    // Auto-fit en UNA hoja: usa la mejor cuadrícula para todas las imágenes
    const { rows, cols } = computeAutoFit(totalImages);
    return { cells: gridCells(rows, cols, marginPct, gapPct), fit: "contain" };
  }
  if (preset === "ine") {
    const ineWmm = 85.6;
    const ineHmm = 54;
    const wPct = (ineWmm / widthMm) * 100;
    const hPct = (ineHmm / heightMm) * 100;
    const xPct = (100 - wPct) / 2;
    const topY = 33 - hPct / 2;
    const botY = 67 - hPct / 2;
    return {
      cells: [
        { xPct, yPct: topY, wPct, hPct },
        { xPct, yPct: botY, wPct, hPct },
      ],
      fit: "cover",
      isIne: true,
    };
  }
  return { cells: [], fit: "contain" };
}

// Construye placements distribuyendo TODAS las imágenes en múltiples páginas si hace falta.
// preset: "full" | "half" | "2x2" | "3x3" | "4x4" | "auto" | "ine"
// returns: [{ id, imageId, xPct, yPct, wPct, hPct, fit, ..., pageIndex }]
export function buildLayout({ preset, images, paper, marginMm }) {
  if (!images || images.length === 0) return [];
  const { widthMm, heightMm } = sheetDimsMm(paper.size, paper.orientation);
  const marginPctW = (marginMm / widthMm) * 100;
  const marginPctH = (marginMm / heightMm) * 100;
  const marginPct = Math.max(marginPctW, marginPctH);
  const gapPct = 1.2;

  const spec = getPresetSpec(preset, {
    widthMm,
    heightMm,
    paper,
    marginPct,
    gapPct,
    totalImages: images.length,
  });

  if (spec.cells.length === 0) return [];

  const placements = [];
  const cellsPerPage = spec.cells.length;

  // Para preset "auto" y "ine" con 1 sola imagen, NO repetir en más páginas.
  // Para el resto: distribuir TODAS las imágenes — si sobran, añadir páginas.
  let count = images.length;
  if (preset === "auto") {
    // Auto-fit usa una sola página; todas las imágenes entran en la cuadrícula calculada
    count = Math.min(images.length, cellsPerPage);
  }
  if (preset === "ine" && images.length === 1) {
    // Modo INE con 1 imagen: duplicar como frente/reverso
    count = 2;
  }

  for (let i = 0; i < count; i++) {
    const img = images[i % images.length];
    const cell = spec.cells[i % cellsPerPage];
    const pageIndex = Math.floor(i / cellsPerPage);
    placements.push({
      id: uid("p"),
      imageId: img.id,
      xPct: cell.xPct,
      yPct: cell.yPct,
      wPct: cell.wPct,
      hPct: cell.hPct,
      fit: spec.fit,
      offsetXPct: 0,
      offsetYPct: 0,
      zoom: 1,
      locked: false,
      isIne: !!spec.isIne,
      pageIndex,
    });
  }
  return placements;
}

// Cuántas páginas se necesitan para una lista de placements
export function pageCountOf(placements) {
  if (!placements || placements.length === 0) return 1;
  let max = 0;
  for (const p of placements) {
    if ((p.pageIndex || 0) > max) max = p.pageIndex || 0;
  }
  return max + 1;
}
