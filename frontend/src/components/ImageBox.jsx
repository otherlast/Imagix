import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { clamp } from "../lib/sheet";
import { usePrinter } from "../store/PrinterContext";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export default function ImageBox({ placement, image, sheetEl }) {
  const {
    updatePlacement,
    setSelectedId,
    selectedId,
    guillotine,
    snapToGrid,
  } = usePrinter();
  const isSelected = selectedId === placement.id;
  const boxRef = useRef(null);

  const getSheetRect = () => sheetEl?.getBoundingClientRect();

  const startDrag = (e) => {
    e.stopPropagation();
    if (placement.locked) return;
    setSelectedId(placement.id);
    const rect = getSheetRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startXPct = placement.xPct;
    const startYPct = placement.yPct;

    const onMove = (ev) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      let nx = clamp(startXPct + dxPct, 0, 100 - placement.wPct);
      let ny = clamp(startYPct + dyPct, 0, 100 - placement.hPct);
      if (snapToGrid) {
        const step = 1; // 1%
        nx = Math.round(nx / step) * step;
        ny = Math.round(ny / step) * step;
      }
      updatePlacement(placement.id, { xPct: nx, yPct: ny });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startResize = (e, dir) => {
    e.stopPropagation();
    e.preventDefault();
    if (placement.locked) return;
    setSelectedId(placement.id);
    const rect = getSheetRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const s = { ...placement };
    const aspect = s.wPct / s.hPct;

    const onMove = (ev) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      let x = s.xPct,
        y = s.yPct,
        w = s.wPct,
        h = s.hPct;
      if (dir.includes("e")) w = s.wPct + dxPct;
      if (dir.includes("s")) h = s.hPct + dyPct;
      if (dir.includes("w")) {
        w = s.wPct - dxPct;
        x = s.xPct + dxPct;
      }
      if (dir.includes("n")) {
        h = s.hPct - dyPct;
        y = s.yPct + dyPct;
      }
      // Mantener proporción del CONTENEDOR si se mantiene Shift; por defecto libre
      if (ev.shiftKey) {
        if (Math.abs(dxPct) > Math.abs(dyPct)) {
          h = w / aspect;
          if (dir.includes("n")) y = s.yPct + (s.hPct - h);
        } else {
          w = h * aspect;
          if (dir.includes("w")) x = s.xPct + (s.wPct - w);
        }
      }
      // Limitar mínimos
      w = Math.max(3, w);
      h = Math.max(3, h);
      // Límites de hoja
      if (x < 0) {
        w += x;
        x = 0;
      }
      if (y < 0) {
        h += y;
        y = 0;
      }
      if (x + w > 100) w = 100 - x;
      if (y + h > 100) h = 100 - y;
      updatePlacement(placement.id, { xPct: x, yPct: y, wPct: w, hPct: h });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Calculamos cómo dibujar la imagen respetando aspect ratio.
  // fit=contain: la imagen entera entra en la caja, márgenes vacíos centrados.
  // fit=cover: la imagen llena la caja recortando lo que sobre. Offset y zoom permiten ajustar.
  const renderImage = () => {
    if (!image) return null;
    if (placement.fit === "contain") {
      return (
        <img
          src={image.src}
          alt={image.name}
          draggable={false}
          className="w-full h-full"
          style={{ objectFit: "contain", display: "block" }}
        />
      );
    }
    // cover
    return (
      <div className="w-full h-full overflow-hidden">
        <img
          src={image.src}
          alt={image.name}
          draggable={false}
          className="w-full h-full"
          style={{
            objectFit: "cover",
            display: "block",
            transform: `translate(${placement.offsetXPct}%, ${placement.offsetYPct}%) scale(${placement.zoom})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    );
  };

  // Selección con click
  useEffect(() => {
    // nothing
  }, []);

  return (
    <div
      ref={boxRef}
      data-testid="canvas-placement"
      data-placement-id={placement.id}
      onMouseDown={startDrag}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedId(placement.id);
      }}
      className={`absolute group no-select ${
        placement.locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      }`}
      style={{
        left: `${placement.xPct}%`,
        top: `${placement.yPct}%`,
        width: `${placement.wPct}%`,
        height: `${placement.hPct}%`,
      }}
    >
      {/* Marcas de corte (guillotina) – borde punteado morado */}
      {guillotine && (
        <div
          className="absolute pointer-events-none"
          style={{
            inset: "-2px",
            border: "1.5px dashed #8b5cf6",
            borderRadius: "2px",
            zIndex: 5,
          }}
        />
      )}

      <div
        className={`relative w-full h-full bg-white ${
          isSelected
            ? "outline outline-2 outline-blue-600 outline-offset-[-1px]"
            : "outline outline-1 outline-slate-200 outline-offset-[-1px] group-hover:outline-blue-300"
        }`}
      >
        {renderImage()}

        {placement.locked && (
          <div className="absolute top-1 right-1 bg-white/95 rounded p-0.5 shadow-sm export-hide">
            <Lock className="h-3 w-3 text-slate-600" />
          </div>
        )}

        {/* Handles de resize – ocultos en exportación */}
        {isSelected &&
          !placement.locked &&
          HANDLES.map((dir) => (
            <span
              key={dir}
              onMouseDown={(e) => startResize(e, dir)}
              className={`absolute h-2.5 w-2.5 bg-white border-2 border-blue-600 rounded-sm z-20 export-hide ${
                {
                  n: "left-1/2 -top-1.5 -translate-x-1/2 cursor-n-resize",
                  s: "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-s-resize",
                  e: "-right-1.5 top-1/2 -translate-y-1/2 cursor-e-resize",
                  w: "-left-1.5 top-1/2 -translate-y-1/2 cursor-w-resize",
                  ne: "-right-1.5 -top-1.5 cursor-ne-resize",
                  nw: "-left-1.5 -top-1.5 cursor-nw-resize",
                  se: "-right-1.5 -bottom-1.5 cursor-se-resize",
                  sw: "-left-1.5 -bottom-1.5 cursor-sw-resize",
                }[dir]
              }`}
            />
          ))}
      </div>
    </div>
  );
}
