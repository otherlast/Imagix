import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { uid, DEFAULT_MARGIN_MM, clamp, sheetDimsMm } from "../lib/sheet";
import { buildLayout } from "../lib/layouts";
import { processIneImage } from "../lib/ineProcessor";

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
      img.onload = () => {
        const item = {
          id: uid("img"),
          src,
          name,
          w: img.naturalWidth,
          h: img.naturalHeight,
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
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const src = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(file);
        });
        const item = await addImageFromSrc(src, file.name || "imagen");
        if (item) added.push(item);
      }
      return added;
    },
    [addImageFromSrc],
  );

  // Reemplaza el src de una imagen (manteniendo id), p.ej. después de procesar INE
  const replaceImageSrc = useCallback((imageId, src) => {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        setImages((prev) =>
          prev.map((it) =>
            it.id === imageId
              ? { ...it, src, w: im.naturalWidth, h: im.naturalHeight }
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
      for (const file of arr) {
        const src = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(file);
        });
        let item = await addImageFromSrc(src, file.name || "imagen");
        if (!item) continue;
        // Si modo INE está activo, procesar la imagen automáticamente
        if (opts.ine || ineMode) {
          const result = await processIneImage(item.src, {
            autoDetect: true,
            applyFilter: true,
          });
          await replaceImageSrc(item.id, result.src);
          item = { ...item, w: result.w, h: result.h };
        }
        const aspect = (item.w || 1) / (item.h || 1);
        // Tamaño por defecto: ~30% del ancho de la hoja, alto proporcional
        const wPct = 30;
        // Calculamos hPct relativo al aspecto de la imagen y de la hoja
        const { widthMm, heightMm } = sheetDimsMm(paper.size, paper.orientation);
        const hPct = (wPct * (widthMm / heightMm)) / aspect;
        const finalH = Math.min(70, Math.max(8, hPct));
        // offset acumulado para múltiples drops
        const xPct = clamp(dropXPct - wPct / 2 + i * 2, 0, 100 - wPct);
        const yPct = clamp(dropYPct - finalH / 2 + i * 2, 0, 100 - finalH);
        const p = placeImage(item.id, {
          xPct,
          yPct,
          wPct,
          hPct: finalH,
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

  // Aplica el layout INE: si hay 0 placements y hay imágenes, las acomoda;
  // si hay 1 imagen, intenta duplicarla (frente/reverso) en posiciones INE.
  const applyIneLayout = useCallback(() => {
    if (images.length === 0) return;
    const imgs = images.slice(0, 2);
    if (imgs.length === 1) {
      // Duplicar la única imagen como frente/reverso
      const next = buildLayout({
        preset: "ine",
        images: [imgs[0], imgs[0]],
        paper,
        marginMm,
      });
      setPlacements(next);
    } else {
      const next = buildLayout({
        preset: "ine",
        images: imgs,
        paper,
        marginMm,
      });
      setPlacements(next);
    }
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
