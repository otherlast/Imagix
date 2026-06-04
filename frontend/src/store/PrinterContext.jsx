import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { uid, DEFAULT_MARGIN_MM, clamp } from "../lib/sheet";
import { buildLayout } from "../lib/layouts";

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
      // setters
      setPaper,
      setMarginMm,
      setGuillotine,
      setSnapToGrid,
      setSelectedId,
      setExportGuillotine,
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
