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

  // Handle drop de miniatura a hoja
  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const imageId = e.dataTransfer.getData("application/x-image-id");
    if (!imageId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    placeImage(imageId, {
      xPct: Math.max(0, Math.min(70, xPct - 15)),
      yPct: Math.max(0, Math.min(70, yPct - 15)),
      wPct: 30,
      hPct: 30,
    });
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
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white/85 backdrop-blur-md border border-slate-200 rounded-full px-3 py-1 text-[11px] font-mono text-slate-600 shadow-sm export-hide">
        {dims.widthMm.toFixed(0)} × {dims.heightMm.toFixed(0)} mm
        <span className="mx-2 text-slate-300">|</span>
        Hoja:{" "}
        {paper.size === "letter" ? "Carta" : "Oficio"} ·{" "}
        {paper.orientation === "portrait" ? "Vertical" : "Horizontal"}
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
            <div className="text-center">
              <ImageIcon className="h-10 w-10 mx-auto opacity-50 mb-2" />
              <p className="text-sm font-medium text-slate-500">
                Hoja vacía
              </p>
              <p className="text-[12px] text-slate-400 mt-0.5">
                Arrastra imágenes aquí o usa un layout automático
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
