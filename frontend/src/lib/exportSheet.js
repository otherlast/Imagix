import jsPDF from "jspdf";
import { sheetDimsMm } from "./sheet";

function loadImageAsync(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject("SRC de imagen vacío");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function getSafeSheetDims(paper) {
  const size = typeof paper === "string" ? paper : paper?.size || "letter";
  const orientation = paper?.orientation || "portrait";
  
  let dims = { widthMm: 215.9, heightMm: 279.4 };
  try {
    dims = sheetDimsMm(size, orientation);
  } catch (e) {
    console.warn("Error calculando dimensiones:", e);
  }

  return {
    size,
    orientation,
    widthMm: paper?.widthMm || dims.widthMm,
    heightMm: paper?.heightMm || dims.heightMm,
  };
}

export async function renderSheetToCanvas({
  paper,
  guillotine,
  placements = [],
  images = [],
  pageIndex = 0,
  scale = 300 / 25.4,
}) {
  const { widthMm, heightMm } = getSafeSheetDims(paper);

  console.log("🔍 --- DIAGNÓSTICO DE RENDERIZADO ---");
  console.log("1. Paper:", paper, `-> Calculado: ${widthMm}x${heightMm} mm`);
  console.log("2. Total Placements recibidos:", placements?.length, placements);
  console.log("3. Total Images recibidas:", images?.length, images);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthMm * scale);
  canvas.height = Math.round(heightMm * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fondo blanco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const safePlacements = Array.isArray(placements) ? placements : [];
  const safeImages = Array.isArray(images) ? images : [];
  const pagePlacements = safePlacements.filter((p) => (p?.pageIndex ?? 0) === pageIndex);

  console.log(`4. Placements en la página ${pageIndex}:`, pagePlacements.length, pagePlacements);

  // Precargar imágenes necesarias
  const imageMap = new Map();
  for (const p of pagePlacements) {
    if (!imageMap.has(p.imageId)) {
      const imgObj = safeImages.find((i) => i.id === p.imageId);
      console.log(`5. Buscando imagen ID '${p.imageId}' en array de imágenes...`, imgObj ? "✅ ENCONTRADA" : "❌ NO ENCONTRADA");
      if (imgObj?.src) {
        try {
          const loaded = await loadImageAsync(imgObj.src);
          imageMap.set(p.imageId, loaded);
        } catch (e) {
          console.error("❌ Error al cargar la imagen:", p.imageId, e);
        }
      }
    }
  }

  // Dibujar cada placement en el canvas
  for (const p of pagePlacements) {
    const img = imageMap.get(p.imageId);
    if (!img) {
      console.warn(`❌ No se pudo dibujar placement ID '${p.id}' porque su imagen no está cargada en memoria.`);
      continue;
    }

    let destX = 0, destY = 0, destWidth = 0, destHeight = 0;

    if (p.xMm !== undefined && p.widthMm !== undefined) {
      destX = p.xMm * scale;
      destY = p.yMm * scale;
      destWidth = p.widthMm * scale;
      destHeight = p.heightMm * scale;
    } else {
      destX = ((p.xPct || 0) / 100) * widthMm * scale;
      destY = ((p.yPct || 0) / 100) * heightMm * scale;
      destWidth = ((p.wPct || 0) / 100) * widthMm * scale;
      destHeight = ((p.hPct || 0) / 100) * heightMm * scale;
    }

    console.log("6. Dibujando elemento en coordenadas px:", { destX, destY, destWidth, destHeight });

    if (destWidth <= 0 || destHeight <= 0) {
      console.warn("❌ Elemento ignorado por tener ancho/alto menor o igual a 0.");
      continue;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(destX, destY, destWidth, destHeight);
    ctx.clip();

    const fitMode = p.fit || "contain";
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    if (fitMode === "fill") {
      ctx.drawImage(img, destX, destY, destWidth, destHeight);
    } else if (fitMode === "contain") {
      const imgAspect = imgW / imgH;
      const boxAspect = destWidth / destHeight;

      let drawW = destWidth;
      let drawH = destHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > boxAspect) {
        drawH = destWidth / imgAspect;
        offsetY = (destHeight - drawH) / 2;
      } else {
        drawW = destHeight * imgAspect;
        offsetX = (destWidth - drawW) / 2;
      }

      ctx.drawImage(img, destX + offsetX, destY + offsetY, drawW, drawH);
    } else if (fitMode === "cover") {
      const zoom = p.zoom || 1;
      const offX = (p.offsetXPct || 0) / 100;
      const offY = (p.offsetYPct || 0) / 100;

      const imgAspect = imgW / imgH;
      const boxAspect = destWidth / destHeight;

      let baseW = imgW;
      let baseH = imgH;

      if (imgAspect > boxAspect) {
        baseW = imgH * boxAspect;
      } else {
        baseH = imgW / boxAspect;
      }

      const srcW = baseW / zoom;
      const srcH = baseH / zoom;

      const centerX = (imgW - srcW) / 2;
      const centerY = (imgH - srcH) / 2;

      const targetX = centerX - offX * (baseW / zoom);
      const targetY = centerY - offY * (baseH / zoom);

      const srcX = Math.max(0, Math.min(imgW - srcW, targetX));
      const srcY = Math.max(0, Math.min(imgH - srcH, targetY));

      ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destWidth, destHeight);
    }

    ctx.restore();

    if (guillotine) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1 * (scale / 11.811);
      ctx.strokeRect(destX, destY, destWidth, destHeight);
    }
  }

  return canvas;
}

export async function exportToPDF({
  paper,
  marginMm,
  guillotine,
  placements = [],
  images = [],
}) {
  console.log("🚀 LLAMADA A EXPORT TO PDF CON PARÁMETROS:", { paper, marginMm, guillotine, placements, images });

  const { size, orientation, widthMm, heightMm } = getSafeSheetDims(paper);

  const safePlacements = Array.isArray(placements) ? placements : [];
  const safeImages = Array.isArray(images) ? images : [];

  const maxPage = safePlacements.reduce((max, p) => Math.max(max, p?.pageIndex ?? 0), 0);
  const isLandscape = orientation === "landscape";

  const pdf = new jsPDF({
    orientation: isLandscape ? "l" : "p",
    unit: "mm",
    format: size === "custom" ? [widthMm, heightMm] : size,
  });

  for (let pageIdx = 0; pageIdx <= maxPage; pageIdx++) {
    if (pageIdx > 0) {
      pdf.addPage([widthMm, heightMm], isLandscape ? "l" : "p");
    }

    const canvas = await renderSheetToCanvas({
      paper,
      marginMm,
      guillotine,
      placements: safePlacements,
      images: safeImages,
      pageIndex: pageIdx,
    });

    if (canvas) {
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, widthMm, heightMm);
    }
  }

  pdf.save("impresion_plantilla.pdf");
}
/**
 * Exporta la página actual directamente como una imagen (PNG o JPG).
 */
export async function exportToImage({
  paper,
  marginMm,
  guillotine,
  placements = [],
  images = [],
  pageIndex = 0,
  format = "png",
}) {
  console.log("🚀 LLAMADA A EXPORT TO IMAGE CON PARÁMETROS:", {
    paper,
    format,
    pageIndex,
    placementsCount: placements?.length,
  });

  const canvas = await renderSheetToCanvas({
    paper,
    marginMm,
    guillotine,
    placements,
    images,
    pageIndex,
  });

  if (!canvas) {
    console.error("❌ No se pudo generar el canvas para exportar la imagen.");
    return;
  }

  const mimeType = format === "jpg" || format === "jpeg" ? "image/jpeg" : "image/png";
  const imageUrl = canvas.toDataURL(mimeType, 0.95);

  const link = document.createElement("a");
  link.download = `impresion_pagina_${pageIndex + 1}.${format}`;
  link.href = imageUrl;
  link.click();
}