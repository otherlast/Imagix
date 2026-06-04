import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { usePrinter } from "../store/PrinterContext";
import { sheetDimsMm } from "../lib/sheet";
import { pageCountOf } from "../lib/layouts";
import ImageBox from "./ImageBox";
import { ImageIcon, Plus } from "lucide-react";

const Canvas = forwardRef(function Canvas(_, ref) {
  const {
    paper,
    placements,
    images,
    marginMm,
    setSelectedId,
    placeImage,
    dropImagesAt,
    ineMode,
  } = usePrinter();
  const containerRef = useRef(null);
  const sheetRefs = useRef([]); // refs por página
  const [sheetSize, setSheetSize] = useState({ w: 600, h: 800 });
  const [dragOverPage, setDragOverPage] = useState(null);

  const dims = useMemo(
    () => sheetDimsMm(paper.size, paper.orientation),
    [paper.size, paper.orientation],
  );

  const numPages = pageCountOf(placements);

  // Exponemos las refs de cada hoja al padre (Header) para exportación
  useImperativeHandle(
    ref,
    () => ({
      getSheetNodes: () => sheetRefs.current.filter(Boolean),
      getPageCount: () => numPages,
    }),
    [numPages],
  );

  // Calcular tamaño en pantalla de la hoja
  useEffect(() => {
    function compute() {
      const el = containerRef.current;
      if (!el) return;
      const paddingX = 80;
      const paddingY = 80;
      const availW = el.clientWidth - paddingX;
      // Solo necesitamos que UNA hoja quepa en el alto disponible visible (luego scrolleamos)
      const availH = Math.max(400, el.clientHeight - paddingY);
      const ratio = dims.widthMm / dims.heightMm;
      let w = availW;
      let h = w / ratio;
      if (h > availH) {
        h = availH;
        w = h * ratio;
      }
      setSheetSize({ w, h });
    }
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [dims.widthMm, dims.heightMm]);

  const onDropToPage = async (e, pageIndex) => {
    e.preventDefault();
    setDragOverPage(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const imageId = e.dataTransfer.getData("application/x-image-id");
    if (imageId) {
      placeImage(imageId, {
        xPct: Math.max(0, Math.min(70, xPct - 15)),
        yPct: Math.max(0, Math.min(70, yPct - 15)),
        wPct: 30,
        hPct: 30,
        pageIndex,
      });
      return;
    }
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await dropImagesAt(files, xPct, yPct, { pageIndex });
    }
  };

  const marginPctW = (marginMm / dims.widthMm) * 100;
  const marginPctH = (marginMm / dims.heightMm) * 100;

  return (
    <main
      ref={containerRef}
      className="flex-1 relative overflow-auto bg-slate-100/60 flex flex-col items-center scrollbar-clean"
      data-testid="canvas-area"
      onClick={() => setSelectedId(null)}
    >
      {/* Indicador de medidas */}
      <div className="sticky top-0 z-30 self-center mt-3 bg-white/85 backdrop-blur-md border border-slate-200 rounded-full px-3 py-1 text-[11px] font-mono text-slate-600 shadow-sm export-hide flex items-center gap-2">
        <span>
          {dims.widthMm.toFixed(0)} × {dims.heightMm.toFixed(0)} mm
        </span>
        <span className="text-slate-300">|</span>
        <span>
          {paper.size === "letter" ? "Carta" : "Oficio"} ·{" "}
          {paper.orientation === "portrait" ? "Vertical" : "Horizontal"}
        </span>
        <span className="text-slate-300">|</span>
        <span data-testid="page-count" className="font-semibold text-slate-800">
          {numPages} {numPages === 1 ? "hoja" : "hojas"}
        </span>
        {ineMode && (
          <>
            <span className="text-slate-300">|</span>
            <span
              data-testid="ine-mode-indicator"
              className="inline-flex items-center gap-1 text-blue-700 font-semibold"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
              Modo INE
            </span>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-6 py-6 px-6">
        {Array.from({ length: numPages }, (_, pageIndex) => {
          const pagePlacements = placements.filter(
            (p) => (p.pageIndex || 0) === pageIndex,
          );
          return (
            <div
              key={pageIndex}
              className="flex flex-col items-center"
              data-testid={`page-wrapper-${pageIndex}`}
            >
              <div className="text-[10px] font-mono text-slate-400 mb-1.5 export-hide">
                Hoja {pageIndex + 1} de {numPages}
              </div>
              <div
                ref={(el) => (sheetRefs.current[pageIndex] = el)}
                data-testid={pageIndex === 0 ? "canvas-workspace" : `canvas-workspace-${pageIndex}`}
                data-page-index={pageIndex}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverPage(pageIndex);
                }}
                onDragLeave={() => setDragOverPage(null)}
                onDrop={(e) => onDropToPage(e, pageIndex)}
                onClick={(e) => e.stopPropagation()}
                className={`relative bg-white paper-shadow no-select ${
                  dragOverPage === pageIndex ? "drop-active" : ""
                }`}
                style={{
                  width: `${sheetSize.w}px`,
                  height: `${sheetSize.h}px`,
                }}
              >
                {/* Margen visual */}
                <div
                  className="absolute pointer-events-none export-hide"
                  style={{
                    left: `${marginPctW}%`,
                    top: `${marginPctH}%`,
                    right: `${marginPctW}%`,
                    bottom: `${marginPctH}%`,
                    border: "1px dashed #cbd5e1",
                    borderRadius: "1px",
                  }}
                />

                {pagePlacements.length === 0 && (
                  <div className="absolute inset-0 grid place-items-center text-slate-400 export-hide pointer-events-none">
                    <div className="text-center px-6">
                      <ImageIcon className="h-10 w-10 mx-auto opacity-50 mb-2" />
                      <p className="text-sm font-medium text-slate-500">
                        Hoja {pageIndex + 1} vacía
                      </p>
                      <p className="text-[12px] text-slate-400 mt-0.5">
                        {ineMode
                          ? "Arrastra una foto de INE — la recortaremos automáticamente"
                          : "Arrastra imágenes desde tu computadora aquí"}
                      </p>
                    </div>
                  </div>
                )}

                {pagePlacements.map((p) => {
                  const img = images.find((i) => i.id === p.imageId);
                  if (!img) return null;
                  return (
                    <ImageBox
                      key={p.id}
                      placement={p}
                      image={img}
                      sheetEl={sheetRefs.current[pageIndex]}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
});

export default Canvas;
