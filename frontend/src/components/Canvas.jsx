import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { usePrinter } from "../store/PrinterContext";
import { sheetDimsMm } from "../lib/sheet";
import ImageBox from "./ImageBox";
import { ImageIcon } from "lucide-react";

const Canvas = forwardRef(function Canvas(_, ref) {
  const {
    paper,
    placements,
    images,
    marginMm,
    setSelectedId,
    placeImage,
    selectedId,
    dropImagesAt,
    ineMode,
  } = usePrinter();
  const containerRef = useRef(null);
  const fallbackSheetRef = useRef(null);
  const sheetRef = ref || fallbackSheetRef;
  const [sheetSize, setSheetSize] = useState({ w: 600, h: 800 });
  const [dragOver, setDragOver] = useState(false);

  const dims = useMemo(
    () => sheetDimsMm(paper.size, paper.orientation),
    [paper.size, paper.orientation],
  );

  // Calcular tamaño en pantalla de la hoja para que quepa con margen
  useEffect(() => {
    function compute() {
      const el = containerRef.current;
      if (!el) return;
      const padding = 64;
      const availW = el.clientWidth - padding;
      const availH = el.clientHeight - padding;
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

  // Handle drop: thumbnail interna O archivos del SO
  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    // 1) Si vino una imagen interna (de la sidebar)
    const imageId = e.dataTransfer.getData("application/x-image-id");
    if (imageId) {
      placeImage(imageId, {
        xPct: Math.max(0, Math.min(70, xPct - 15)),
        yPct: Math.max(0, Math.min(70, yPct - 15)),
        wPct: 30,
        hPct: 30,
      });
      return;
    }
    // 2) Si vienen archivos del SO
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await dropImagesAt(files, xPct, yPct);
    }
  };

  const marginPctW = (marginMm / dims.widthMm) * 100;
  const marginPctH = (marginMm / dims.heightMm) * 100;

  return (
    <main
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-slate-100/60 flex items-center justify-center"
      data-testid="canvas-area"
      onClick={() => setSelectedId(null)}
    >
      {/* Indicador de medidas */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white/85 backdrop-blur-md border border-slate-200 rounded-full px-3 py-1 text-[11px] font-mono text-slate-600 shadow-sm export-hide flex items-center gap-2">
        <span>
          {dims.widthMm.toFixed(0)} × {dims.heightMm.toFixed(0)} mm
        </span>
        <span className="text-slate-300">|</span>
        <span>
          Hoja: {paper.size === "letter" ? "Carta" : "Oficio"} ·{" "}
          {paper.orientation === "portrait" ? "Vertical" : "Horizontal"}
        </span>
        {ineMode && (
          <>
            <span className="text-slate-300">|</span>
            <span
              data-testid="ine-mode-indicator"
              className="inline-flex items-center gap-1 text-blue-700 font-semibold"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
              Modo INE activo
            </span>
          </>
        )}
      </div>

      <div
        ref={sheetRef}
        data-testid="canvas-workspace"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white paper-shadow no-select ${
          dragOver ? "drop-active" : ""
        }`}
        style={{
          width: `${sheetSize.w}px`,
          height: `${sheetSize.h}px`,
        }}
      >
        {/* Margen visual (guía, no exportada) */}
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

        {placements.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-slate-400 export-hide pointer-events-none">
            <div className="text-center px-6">
              <ImageIcon className="h-10 w-10 mx-auto opacity-50 mb-2" />
              <p className="text-sm font-medium text-slate-500">
                Hoja vacía
              </p>
              <p className="text-[12px] text-slate-400 mt-0.5">
                {ineMode
                  ? "Arrastra una foto de INE aquí — la recortaremos y limpiaremos automáticamente"
                  : "Arrastra imágenes desde tu computadora directamente aquí"}
              </p>
            </div>
          </div>
        )}

        {placements.map((p) => {
          const img = images.find((i) => i.id === p.imageId);
          if (!img) return null;
          return (
            <ImageBox
              key={p.id}
              placement={p}
              image={img}
              sheetEl={sheetRef.current}
            />
          );
        })}
      </div>
    </main>
  );
});

export default Canvas;
