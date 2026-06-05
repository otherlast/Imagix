import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { uid, DEFAULT_MARGIN_MM, clamp, sheetDimsMm } from "../lib/sheet";
import { buildLayout } from "../lib/layouts";
import { processIneImage } from "../lib/ineProcessor";
import { makeThumbnail, compressForCanvas } from "../lib/imageUtils";

const PrinterContext = createContext(null);

export function PrinterProvider({ children }) {
  const [images, setImages] = useState([]); // {id, src, name, w, h}
  const [placements, setPlacements] = useState([]); // see layouts.js
  const [paper, setPaper] = useState({
    size: "letter",
    orientation: "portrait",
  });
  const [marginMm, setMarginMm] = useState(DEFAULT_MARGIN_MM);
  const [guillotine, setGuillotine] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [internalClipboard, setInternalClipboard] = useState(null);
  const [exportGuillotine, setExportGuillotine] = useState(false);
  const [ineMode, setIneMode] = useState(false);

  const addImageFromSrc = useCallback(async (src, name = "imagen") => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        // Comprimir imágenes muy grandes (>2000px de lado) para no saturar memoria/render
        const compressed = await compressForCanvas(src, 2000, 0.92);
        const finalSrc = compressed.src;
        const w = compressed.w || img.naturalWidth;
        const h = compressed.h || img.naturalHeight;
        const thumb = await makeThumbnail(finalSrc, 240);
        const item = {
          id: uid("img"),
          src: finalSrc,
          thumb,
          name,
          w,
          h,
        };
        setImages((prev) => [...prev, item]);
        resolve(item);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }, []);

  const addImagesFromFiles = useCallback(
    async (files) => {
      const added = [];
      const failed = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          failed.push(file.name);
          continue;
        }
        const src = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = () => res(null);
          r.readAsDataURL(file);
        });
        if (!src) {
          failed.push(file.name);
          continue;
        }
        const item = await addImageFromSrc(src, file.name || "imagen");
        if (item) added.push(item);
        else failed.push(file.name);
      }
      return { added, failed };
    },
    [addImageFromSrc],
  );

  // Reemplaza el src de una imagen (manteniendo id), p.ej. después de procesar INE
  const replaceImageSrc = useCallback((imageId, src) => {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = async () => {
        const thumb = await makeThumbnail(src, 240);
        setImages((prev) =>
          prev.map((it) =>
            it.id === imageId
              ? { ...it, src, thumb, w: im.naturalWidth, h: im.naturalHeight }
              : it,
          ),
        );
        resolve(true);
      };
      im.onerror = () => resolve(false);
      im.src = src;
    });
  }, []);

  // Procesa una imagen ya cargada como INE: detecta bordes + filtro escáner
  const processImageAsIne = useCallback(
    async (imageId, options = {}) => {
      const img = images.find((it) => it.id === imageId);
      if (!img) return null;
      const result = await processIneImage(img.src, {
        autoDetect: true,
        applyFilter: true,
        ...options,
      });
      await replaceImageSrc(imageId, result.src);
      return result;
    },
    [images, replaceImageSrc],
  );

  const removeImage = useCallback((imageId) => {
    setImages((prev) => prev.filter((i) => i.id !== imageId));
    setPlacements((prev) => prev.filter((p) => p.imageId !== imageId));
  }, []);

  const placeImage = useCallback((imageId, partial = {}) => {
    const p = {
      id: uid("p"),
      imageId,
      xPct: 10,
      yPct: 10,
      wPct: 30,
      hPct: 30,
      fit: "contain",
      offsetXPct: 0,
      offsetYPct: 0,
      zoom: 1,
      locked: false,
      pageIndex: 0,
      ...partial,
    };
    setPlacements((prev) => [...prev, p]);
    setSelectedId(p.id);
    return p;
  }, []);

  const updatePlacement = useCallback((id, patch) => {
    setPlacements((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }, []);

  const removePlacement = useCallback((id) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const applyLayout = useCallback(
    (preset) => {
      if (images.length === 0) return;
      const next = buildLayout({ preset, images, paper, marginMm });
      setPlacements(next);
      setSelectedId(null);
    },
    [images, paper, marginMm],
  );

  const clearAll = useCallback(() => {
    setImages([]);
    setPlacements([]);
    setSelectedId(null);
    setInternalClipboard(null);
  }, []);

  const clearCanvas = useCallback(() => {
    setPlacements([]);
    setSelectedId(null);
  }, []);

  const resetPlacement = useCallback((id) => {
    setPlacements((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, fit: "contain", offsetXPct: 0, offsetYPct: 0, zoom: 1 }
          : p,
      ),
    );
  }, []);

  const copySelected = useCallback(() => {
    if (!selectedId) return;
    const p = placements.find((x) => x.id === selectedId);
    if (p) setInternalClipboard({ ...p });
  }, [selectedId, placements]);

  // Duplicar la imagen seleccionada (copia + paste en un solo paso)
  const duplicateSelected = useCallback(() => {
    if (!selectedId) return null;
    const p = placements.find((x) => x.id === selectedId);
    if (!p) return null;
    const nx = clamp(p.xPct + 4, 0, 100 - p.wPct);
    const ny = clamp(p.yPct + 4, 0, 100 - p.hPct);
    return placeImage(p.imageId, {
      ...p,
      xPct: nx,
      yPct: ny,
    });
  }, [selectedId, placements, placeImage]);

  const pasteInternal = useCallback(() => {
    if (!internalClipboard) return null;
    const nx = clamp(internalClipboard.xPct + 4, 0, 95);
    const ny = clamp(internalClipboard.yPct + 4, 0, 95);
    return placeImage(internalClipboard.imageId, {
      ...internalClipboard,
      xPct: nx,
      yPct: ny,
    });
  }, [internalClipboard, placeImage]);

  // Drop directo desde el SO al lienzo: carga la imagen Y crea su placement
  // en la posición indicada (xPct/yPct relativos a la hoja).
  const dropImagesAt = useCallback(
    async (files, dropXPct, dropYPct, opts = {}) => {
      const arr = Array.from(files || []).filter((f) =>
        f.type?.startsWith("image/"),
      );
      if (arr.length === 0) return [];
      const placed = [];
      let i = 0;
      const targetPage = opts.pageIndex ?? 0;
      for (const file of arr) {
        const src = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(file);
        });
        let item = await addImageFromSrc(src, file.name || "imagen");
        if (!item) continue;
        if (opts.ine || ineMode) {
          const result = await processIneImage(item.src, {
            autoDetect: true,
            applyFilter: true,
          });
          await replaceImageSrc(item.id, result.src);
          item = { ...item, w: result.w, h: result.h };
        }
        const aspect = (item.w || 1) / (item.h || 1);
        const wPct = 30;
        const { widthMm, heightMm } = sheetDimsMm(paper.size, paper.orientation);
        const wMm = (wPct / 100) * widthMm;
        const hMm = wMm / aspect;
        const hPctRaw = (hMm / heightMm) * 100;
        const finalH = Math.min(80, Math.max(5, hPctRaw));
        const xPct = clamp(dropXPct - wPct / 2 + i * 2, 0, 100 - wPct);
        const yPct = clamp(dropYPct - finalH / 2 + i * 2, 0, 100 - finalH);
        const p = placeImage(item.id, {
          xPct,
          yPct,
          wPct,
          hPct: finalH,
          pageIndex: targetPage,
        });
        placed.push(p);
        i++;
      }
      return placed;
    },
    [
      addImageFromSrc,
      placeImage,
      paper,
      ineMode,
      replaceImageSrc,
    ],
  );

  // Aplica el layout INE: distribuye TODAS las imágenes en pares (frente/reverso) por hoja.
  // Si solo hay 1 imagen, la duplica como frente y reverso.
  const applyIneLayout = useCallback(() => {
    if (images.length === 0) return;
    let imgs = images;
    if (imgs.length === 1) imgs = [imgs[0], imgs[0]];
    const next = buildLayout({
      preset: "ine",
      images: imgs,
      paper,
      marginMm,
    });
    setPlacements(next);
    setSelectedId(null);
  }, [images, paper, marginMm]);

  const value = useMemo(
    () => ({
      // state
      images,
      placements,
      paper,
      marginMm,
      guillotine,
      snapToGrid,
      selectedId,
      internalClipboard,
      exportGuillotine,
      ineMode,
      // setters
      setPaper,
      setMarginMm,
      setGuillotine,
      setSnapToGrid,
      setSelectedId,
      setExportGuillotine,
      setIneMode,
      // actions
      addImagesFromFiles,
      addImageFromSrc,
      removeImage,
      placeImage,
      updatePlacement,
      removePlacement,
      applyLayout,
      clearAll,
      clearCanvas,
      resetPlacement,
      copySelected,
      pasteInternal,
      duplicateSelected,
      dropImagesAt,
      processImageAsIne,
      applyIneLayout,
      replaceImageSrc,
    }),
    [
      images,
      placements,
      paper,
      marginMm,
      guillotine,
      snapToGrid,
      selectedId,
      internalClipboard,
      exportGuillotine,
      ineMode,
      addImagesFromFiles,
      addImageFromSrc,
      removeImage,
      placeImage,
      updatePlacement,
      removePlacement,
      applyLayout,
      clearAll,
      clearCanvas,
      resetPlacement,
      copySelected,
      pasteInternal,
      duplicateSelected,
      dropImagesAt,
      processImageAsIne,
      applyIneLayout,
      replaceImageSrc,
    ],
  );

  return (
    <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>
  );
}

export function usePrinter() {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error("usePrinter debe usarse dentro de PrinterProvider");
  return ctx;
}
