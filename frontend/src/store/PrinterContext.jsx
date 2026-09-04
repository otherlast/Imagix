import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { uid, DEFAULT_MARGIN_MM } from "../lib/sheet";
import { buildLayout } from "../lib/layouts";
import { processIneImage } from "../lib/ineProcessor";
import { makeThumbnail, compressForCanvas } from "../lib/imageUtils";
import { saveProjectLocal, loadProjectLocal, clearProjectLocal } from "../lib/db";

const PrinterContext = createContext(null);

const HISTORY_LIMIT = 50;

const DEFAULT_PAPER = {
  name: "Carta",
  size: "letter",
  orientation: "portrait",
  widthMm: 215.9,
  heightMm: 279.4,
};

export function PrinterProvider({ children }) {
  const [images, setImages] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [paper, setPaper] = useState(DEFAULT_PAPER);
  const [marginMm, setMarginMm] = useState(DEFAULT_MARGIN_MM);
  const [guillotine, setGuillotine] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [internalClipboard, setInternalClipboard] = useState(null);
  const [exportGuillotine, setExportGuillotine] = useState(false);
  const [ineMode, setIneMode] = useState(false);

  const [history, setHistory] = useState({ past: [], future: [] });
  const imagesRef = useRef(images);
  const placementsRef = useRef(placements);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  // ==========================================
  // CONEXIÓN CON BASE DE DATOS LOCAL (IndexedDB)
  // ==========================================
  const isLoadedRef = useRef(false);

  useEffect(() => {
    async function loadDB() {
      try {
        const data = await loadProjectLocal();
        if (data && !isLoadedRef.current) {
          if (data.images && Array.isArray(data.images)) {
            setImages(data.images);
          }
          if (data.placements && Array.isArray(data.placements)) {
            setPlacements(data.placements);
          }
          if (data.paper && typeof data.paper === "object") {
            setPaper((prev) => ({ ...prev, ...data.paper }));
          }
        }
      } catch (err) {
        console.error("Error al cargar IndexedDB:", err);
      } finally {
        isLoadedRef.current = true;
      }
    }
    loadDB();
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;

    const timer = setTimeout(() => {
      saveProjectLocal(images, placements);
    }, 1000);

    return () => clearTimeout(timer);
  }, [images, placements]);

  const commit = useCallback(() => {
    setHistory((h) => ({
      past: [
        ...h.past.slice(-(HISTORY_LIMIT - 1)),
        {
          images: imagesRef.current,
          placements: placementsRef.current,
        },
      ],
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, -1);
      const currentSnap = {
        images: imagesRef.current,
        placements: placementsRef.current,
      };
      setImages(prev.images);
      setPlacements(prev.placements);
      setSelectedId(null);
      return { past: newPast, future: [...h.future, currentSnap] };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[h.future.length - 1];
      const newFuture = h.future.slice(0, -1);
      const currentSnap = {
        images: imagesRef.current,
        placements: placementsRef.current,
      };
      setImages(next.images);
      setPlacements(next.placements);
      setSelectedId(null);
      return { past: [...h.past, currentSnap], future: newFuture };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const addImageFromSrc = useCallback(async (src, name = "imagen") => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        let finalSrc = src;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        let thumb = src;

        try {
          if (typeof compressForCanvas === "function") {
            const compressed = await compressForCanvas(src, 2000, 0.92);
            finalSrc = compressed.src || src;
            w = compressed.w || img.naturalWidth;
            h = compressed.h || img.naturalHeight;
          }
          if (typeof makeThumbnail === "function") {
            thumb = await makeThumbnail(finalSrc, 240);
          }
        } catch (e) {
          console.warn("Error en compresión/miniatura:", e);
        }

        const item = {
          id: uid("img"),
          src: finalSrc,
          thumb: thumb || finalSrc,
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
        if (!file.type?.startsWith("image/")) {
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
    [addImageFromSrc]
  );

  const replaceImageSrc = useCallback((imageId, src) => {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = async () => {
        let thumb = src;
        try {
          if (typeof makeThumbnail === "function") {
            thumb = await makeThumbnail(src, 240);
          }
        } catch (e) {
          console.warn("Error generando miniatura:", e);
        }
        setImages((prev) =>
          prev.map((it) =>
            it.id === imageId
              ? { ...it, src, thumb, w: im.naturalWidth, h: im.naturalHeight }
              : it
          )
        );
        setTimeout(() => resolve(true), 0);
      };
      im.onerror = () => resolve(false);
      im.src = src;
    });
  }, []);

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
    [images, replaceImageSrc]
  );

  const removeImage = useCallback(
    (imageId) => {
      commit();
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      setPlacements((prev) => prev.filter((p) => p.imageId !== imageId));
    },
    [commit]
  );

  const placeImage = useCallback(
    (imageId, partial = {}) => {
      commit();
      const { id: _ignoredId, ...rest } = partial;
      const p = {
        pageIndex: 0,
        fit: "contain",
        offsetXPct: 0,
        offsetYPct: 0,
        zoom: 1,
        locked: false,
        xPct: 10,
        yPct: 10,
        wPct: 30,
        hPct: 30,
        xMm: 10,
        yMm: 10,
        widthMm: 50,
        heightMm: 50,
        rotation: 0,
        ...rest,
        id: uid("p"),
        imageId,
      };
      setPlacements((prev) => [...prev, p]);
      setSelectedId(p.id);
      return p;
    },
    [commit]
  );

  const updatePlacement = useCallback((id, patch) => {
    setPlacements((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }, []);

  const removePlacement = useCallback(
    (id) => {
      commit();
      setPlacements((prev) => prev.filter((p) => p.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [commit]
  );

  const duplicatePlacement = useCallback(
    (id, patch = {}) => {
      commit();
      const p = placements.find((item) => item.id === id);
      if (!p) return null;
      const newPlacement = {
        ...p,
        id: uid("p"),
        xMm: (p.xMm || 0) + 5,
        yMm: (p.yMm || 0) + 5,
        ...patch,
      };
      setPlacements((prev) => [...prev, newPlacement]);
      setSelectedId(newPlacement.id);
      return newPlacement;
    },
    [placements, commit]
  );

  const fitPlacementToSheet = useCallback(
    (id) => {
      commit();
      const p = paper || DEFAULT_PAPER;
      setPlacements((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            xMm: 0,
            yMm: 0,
            widthMm: p.widthMm || 215.9,
            heightMm: p.heightMm || 279.4,
            rotation: 0,
          };
        })
      );
    },
    [paper, commit]
  );

  const autoArrange = useCallback(() => {
    if (placements.length === 0) return;
    commit();
    const pPaper = paper || DEFAULT_PAPER;
    const margin = marginMm || 10;
    let currentX = margin;
    let currentY = margin;
    let maxRowHeight = 0;

    setPlacements((prev) =>
      prev.map((item) => {
        const w = item.widthMm || 50;
        const h = item.heightMm || 50;

        if (currentX + w > pPaper.widthMm - margin) {
          currentX = margin;
          currentY += maxRowHeight + 5;
          maxRowHeight = 0;
        }

        const nextPlacement = {
          ...item,
          xMm: currentX,
          yMm: currentY,
        };

        currentX += w + 5;
        if (h > maxRowHeight) maxRowHeight = h;

        return nextPlacement;
      })
    );
  }, [placements, paper, marginMm, commit]);

  const applyInfantilFormat = useCallback(
    (placementId) => {
      commit();
      setPlacements((prev) =>
        prev.map((p) => {
          if (p.id !== placementId) return p;
          return {
            ...p,
            fit: "cover",
            zoom: 1.25,
            offsetXPct: 0,
            offsetYPct: -12,
            widthMm: 25,
            heightMm: 30,
          };
        })
      );
    },
    [commit]
  );

  const applyLayout = useCallback(
    (preset) => {
      const sourceImages =
        placements.length > 0
          ? placements
              .map((p) => images.find((i) => i.id === p.imageId))
              .filter(Boolean)
          : images;
      if (sourceImages.length === 0) return;
      commit();
      const next = buildLayout({
        preset,
        images: sourceImages,
        paper,
        marginMm,
      });
      setPlacements(next);
      setSelectedId(null);
    },
    [images, placements, paper, marginMm, commit]
  );

  const clearAll = useCallback(() => {
    commit();
    setImages([]);
    setPlacements([]);
    setSelectedId(null);
    setInternalClipboard(null);
    if (typeof clearProjectLocal === "function") {
      clearProjectLocal();
    }
  }, [commit]);

  const clearCanvas = useCallback(() => {
    commit();
    setPlacements([]);
    setSelectedId(null);
  }, [commit]);

  const resetPlacement = useCallback(
    (id) => {
      commit();
      setPlacements((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, fit: "contain", offsetXPct: 0, offsetYPct: 0, zoom: 1 }
            : p
        )
      );
    },
    [commit]
  );

  const copySelected = useCallback(() => {
    if (!selectedId) return;
    const p = placements.find((x) => x.id === selectedId);
    if (p) setInternalClipboard({ ...p });
  }, [selectedId, placements]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return null;
    const p = placements.find((x) => x.id === selectedId);
    if (!p) return null;
    return duplicatePlacement(selectedId);
  }, [selectedId, placements, duplicatePlacement]);

  const pasteInternal = useCallback(() => {
    if (!internalClipboard) return null;
    return duplicatePlacement(internalClipboard.id);
  }, [internalClipboard, duplicatePlacement]);

  const dropImagesAt = useCallback(
    async (files, dropXPct, dropYPct, opts = {}) => {
      const arr = Array.from(files || []).filter((f) =>
        f.type?.startsWith("image/")
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
        const wMm = 50;
        const hMm = wMm / aspect;
        const p = placeImage(item.id, {
          xMm: 10 + i * 5,
          yMm: 10 + i * 5,
          widthMm: wMm,
          heightMm: hMm,
          pageIndex: targetPage,
        });
        placed.push(p);
        i++;
      }
      return placed;
    },
    [addImageFromSrc, placeImage, ineMode, replaceImageSrc]
  );

  const applyIneLayout = useCallback(() => {
    if (images.length === 0) return;
    commit();
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
  }, [images, paper, marginMm, commit]);

  const value = useMemo(
    () => ({
      images,
      placements,
      paper: paper || DEFAULT_PAPER,
      marginMm,
      guillotine,
      snapToGrid,
      selectedId,
      selectedPlacementId: selectedId,
      setSelectedPlacementId: setSelectedId,
      internalClipboard,
      exportGuillotine,
      ineMode,
      canUndo,
      canRedo,
      setPaper,
      setMarginMm,
      setGuillotine,
      setSnapToGrid,
      setSelectedId,
      setExportGuillotine,
      setIneMode,
      addImagesFromFiles,
      addImageFromSrc,
      removeImage,
      placeImage,
      updatePlacement,
      removePlacement,
      duplicatePlacement,
      fitPlacementToSheet,
      autoArrange,
      applyLayout,
      applyInfantilFormat,
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
      undo,
      redo,
      commit,
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
      canUndo,
      canRedo,
      addImagesFromFiles,
      addImageFromSrc,
      removeImage,
      placeImage,
      updatePlacement,
      removePlacement,
      duplicatePlacement,
      fitPlacementToSheet,
      autoArrange,
      applyLayout,
      applyInfantilFormat,
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
      undo,
      redo,
      commit,
    ]
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