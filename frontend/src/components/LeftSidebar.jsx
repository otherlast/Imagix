import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Image as ImageIcon, X, Plus, Clipboard, LayoutGrid } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { usePrinter } from "../store/PrinterContext";
import { toast } from "sonner";

export default function LeftSidebar() {
  const { images, addImagesFromFiles, removeImage, placeImage } = usePrinter();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // Procesamiento unificado de archivos (Subida, Drag&Drop, Paste)
  const processFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length === 0) return;

      const { added, failed } = await addImagesFromFiles(files);
      if (added?.length) toast.success(`${added.length} imagen(es) cargada(s)`);
      if (failed?.length) {
        toast.error(
          `${failed.length} archivo(s) no validos: ${failed.slice(0, 2).join(", ")}${failed.length > 2 ? "..." : ""}`
        );
      }
    },
    [addImagesFromFiles]
  );

  // Soporte nativo para Ctrl + V (Portapapeles)
  useEffect(() => {
    const handlePaste = (e) => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.isContentEditable
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const files = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const namedFile = new File(
              [file],
              file.name || `clip-${Date.now()}.png`,
              { type: file.type }
            );
            files.push(namedFile);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        processFiles(files);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processFiles]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handlePlaceAll = () => {
    if (!images?.length) return;
    images.forEach((img) => placeImage(img.id));
    toast.success(`${images.length} imágenes agregadas al lienzo`);
  };

  return (
    <aside
      data-testid="left-sidebar"
      className="w-72 bg-white border-r border-slate-200 flex flex-col z-40 shrink-0 select-none"
    >
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Imágenes
        </p>
      </div>

      {/* ZONA DE CARGA (DROPZONE) */}
      <div className="px-4 pb-3">
        <div
          data-testid="upload-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center p-5 text-center cursor-pointer ${
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-blue-400"
          }`}
        >
          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-900 grid place-items-center mb-2">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-800">
            Arrastra imágenes aquí
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            o haz click para seleccionar
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            <Clipboard className="h-3 w-3 inline-block mr-1 -mt-0.5" /> también
            pega con Ctrl+V
          </p>
          <input
            ref={inputRef}
            data-testid="file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              processFiles(e.target.files);
              e.target.value = ""; // Fix bug de re-subida del mismo archivo
            }}
          />
        </div>
      </div>

      {/* CONTROLES INTERMEDIOS */}
      <div className="px-4 pb-2 flex items-center justify-between gap-1">
        <p className="text-xs font-medium text-slate-600 truncate">
          {images.length === 0
            ? "Aún sin imágenes"
            : `${images.length} cargada${images.length === 1 ? "" : "s"}`}
        </p>

        <div className="flex items-center gap-1">
          {images.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlaceAll}
              className="h-7 px-2 text-[11px] border-blue-200 text-blue-900 hover:bg-blue-50"
              data-testid="add-all-button"
              title="Agregar todas las imágenes al lienzo"
            >
              <LayoutGrid className="h-3 w-3 mr-1" />
              Todas
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="h-7 px-2 text-xs"
            data-testid="add-more-button"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
          </Button>
        </div>
      </div>

      {/* GALERÍA DE MINIATURAS */}
      <ScrollArea className="flex-1 scrollbar-clean">
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {images.length === 0 && (
            <div className="col-span-2 text-center py-10 text-slate-400">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Sin imágenes cargadas</p>
            </div>
          )}
          {images.map((img) => (
            <div
              key={img.id}
              data-testid="image-thumbnail-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-image-id", img.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="group relative rounded-lg overflow-hidden border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing"
              onDoubleClick={() => placeImage(img.id)}
              title={`${img.name} · ${img.w}×${img.h}px — doble-click para colocar`}
            >
              <div
                className="checker-bg w-full"
                style={{ aspectRatio: "1 / 1" }}
              >
                <img
                  src={img.thumb || img.src}
                  alt={img.name}
                  loading="lazy"
                  className="w-full h-full object-contain block"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.style.opacity = "0.2";
                  }}
                />
              </div>
              <button
                data-testid="remove-image-button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
                className="absolute top-1 right-1 h-6 w-6 rounded-md bg-white/95 border border-slate-200 grid place-items-center text-slate-500 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Quitar imagen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="px-1.5 py-1 bg-white border-t border-slate-100">
                <p className="text-[10px] font-medium text-slate-700 truncate">
                  {img.name}
                </p>
                <p className="text-[9px] text-slate-400 font-mono">
                  {img.w}×{img.h}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
        Doble-click en una miniatura para colocarla. Arrástrala al lienzo para
        soltarla donde quieras.
      </div>
    </aside>
  );
}