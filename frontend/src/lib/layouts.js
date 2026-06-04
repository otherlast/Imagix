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

// preset: "2x2" | "3x3" | "4x4" | "auto" | "half"
export function buildLayout({ preset, images, paper, marginMm }) {
  if (!images || images.length === 0) return [];
  const { widthMm, heightMm } = sheetDimsMm(paper.size, paper.orientation);
  const marginPctW = (marginMm / widthMm) * 100;
  const marginPctH = (marginMm / heightMm) * 100;
  const marginPct = Math.max(marginPctW, marginPctH);
  const gapPct = 1.2;

  let cells = [];
  if (preset === "half") {
    // Dos imágenes – cada una ocupa la mitad de la hoja respetando orientación
    const isLandscape = paper.orientation === "landscape";
    if (isLandscape) {
      cells = gridCells(1, 2, marginPct, gapPct);
    } else {
      cells = gridCells(2, 1, marginPct, gapPct);
    }
  } else if (preset === "2x2") {
    cells = gridCells(2, 2, marginPct, gapPct);
  } else if (preset === "3x3") {
    cells = gridCells(3, 3, marginPct, gapPct);
  } else if (preset === "4x4") {
    cells = gridCells(4, 4, marginPct, gapPct);
  } else if (preset === "auto") {
    const { rows, cols } = computeAutoFit(images.length);
    cells = gridCells(rows, cols, marginPct, gapPct);
  } else if (preset === "ine") {
    // 2 credenciales INE en tamaño real 85.6×54 mm, centradas vertical,
    // una arriba (frente) y otra abajo (reverso).
    const ineWmm = 85.6;
    const ineHmm = 54;
    const wPct = (ineWmm / widthMm) * 100;
    const hPct = (ineHmm / heightMm) * 100;
    const xPct = (100 - wPct) / 2;
    // Distribución vertical: la hoja se divide en 3 espacios (margen, espacio, margen)
    // Frente arriba (~30% Y), reverso abajo (~70% Y)
    const topY = 33 - hPct / 2;
    const botY = 67 - hPct / 2;
    cells = [
      { xPct, yPct: topY, wPct, hPct, _ine: true },
      { xPct, yPct: botY, wPct, hPct, _ine: true },
    ];
  }

  const placements = [];
  const max = Math.min(images.length, cells.length);
  for (let i = 0; i < max; i++) {
    const img = images[i];
    const cell = cells[i];
    placements.push({
      id: uid("p"),
      imageId: img.id,
      xPct: cell.xPct,
      yPct: cell.yPct,
      wPct: cell.wPct,
      hPct: cell.hPct,
      fit: cell._ine ? "cover" : "contain",
      offsetXPct: 0,
      offsetYPct: 0,
      zoom: 1,
      locked: false,
      isIne: !!cell._ine,
    });
  }
  return placements;
}
