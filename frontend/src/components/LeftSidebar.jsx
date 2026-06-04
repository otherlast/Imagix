import { useCallback, useRef, useState } from "react";
import { Upload, Image as ImageIcon, X, Plus, Clipboard } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { usePrinter } from "../store/PrinterContext";
import { toast } from "sonner";

export default function LeftSidebar() {
  const { images, addImagesFromFiles, removeImage, placeImage } = usePrinter();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const onFilesPicked = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;
      const added = await addImagesFromFiles(files);
      if (added.length) toast.success(`${added.length} imagen(es) cargada(s)`);
    },
    [addImagesFromFiles],
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onFilesPicked(e.dataTransfer.files);
  };

  return (
    <aside
      data-testid="left-sidebar"
      className="w-72 bg-white border-r border-slate-200 flex flex-col z-40 shrink-0"
    >
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Imágenes
        </p>
      </div>

      <div className="px-4 pb-3">
        <div
          data-testid="upload-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
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
            onChange={(e) => onFilesPicked(e.target.files)}
          />
        </div>
      </div>

      <div className="px-4 pb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">
          {images.length === 0
            ? "Aún sin imágenes"
            : `${images.length} cargada${images.length === 1 ? "" : "s"}`}
        </p>
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

      <ScrollArea className="flex-1 scrollbar-clean">
        <div className="px-4 pb-4 grid grid-cols-2 gap-2.5">
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
              className="group relative rounded-lg overflow-hidden border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all bg-slate-50 aspect-square cursor-grab active:cursor-grabbing"
              onDoubleClick={() => placeImage(img.id)}
              title={`${img.name} · ${img.w}×${img.h}`}
            >
              <img
                src={img.src}
                alt={img.name}
                className="w-full h-full object-contain bg-slate-100"
                draggable={false}
              />
              <button
                data-testid="remove-image-button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
                className="absolute top-1 right-1 h-6 w-6 rounded-md bg-white/90 border border-slate-200 grid place-items-center text-slate-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Quitar imagen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/55 to-transparent">
                <p className="text-[10px] text-white truncate">{img.name}</p>
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
