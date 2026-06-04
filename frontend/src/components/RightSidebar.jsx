import {
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  Sparkles,
  SplitSquareHorizontal,
  RotateCcw,
  Lock,
  LockOpen,
  Trash2,
  ZoomIn,
  Crop,
  Eraser,
  CreditCard,
  Wand2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { usePrinter } from "../store/PrinterContext";
import { SHEET_SIZES } from "../lib/sheet";

const LayoutBtn = ({ icon: Icon, label, onClick, testid }) => (
  <Button
    variant="outline"
    onClick={onClick}
    data-testid={testid}
    className="h-auto flex-col py-3 gap-1.5 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900"
  >
    <Icon className="h-5 w-5" />
    <span className="text-[11px] font-medium">{label}</span>
  </Button>
);

export default function RightSidebar() {
  const {
    paper,
    setPaper,
    marginMm,
    setMarginMm,
    applyLayout,
    clearCanvas,
    selectedId,
    placements,
    images,
    updatePlacement,
    removePlacement,
    resetPlacement,
    ineMode,
    applyIneLayout,
    processImageAsIne,
  } = usePrinter();

  const selected = placements.find((p) => p.id === selectedId);
  const selectedImage = selected
    ? images.find((i) => i.id === selected.imageId)
    : null;

  return (
    <aside
      data-testid="right-sidebar"
      className="w-80 bg-white border-l border-slate-200 flex flex-col z-40 shrink-0"
    >
      <ScrollArea className="flex-1 scrollbar-clean">
        <div className="p-4 space-y-5">
          {/* Hoja */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Hoja de impresión
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">Tamaño</label>
                <Select
                  value={paper.size}
                  onValueChange={(v) => setPaper({ ...paper, size: v })}
                >
                  <SelectTrigger
                    className="h-9 mt-1"
                    data-testid="paper-size-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SHEET_SIZES).map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        data-testid={`paper-size-${s.id}`}
                      >
                        {s.label} ({s.widthMm.toFixed(0)}×
                        {s.heightMm.toFixed(0)} mm)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">
                  Orientación
                </label>
                <Select
                  value={paper.orientation}
                  onValueChange={(v) =>
                    setPaper({ ...paper, orientation: v })
                  }
                >
                  <SelectTrigger
                    className="h-9 mt-1"
                    data-testid="orientation-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Vertical</SelectItem>
                    <SelectItem value="landscape">Horizontal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-slate-500">
                  Margen (mm)
                </label>
                <span className="text-[11px] font-mono text-slate-700">
                  {marginMm.toFixed(1)} mm
                </span>
              </div>
              <Slider
                value={[marginMm]}
                onValueChange={([v]) => setMarginMm(v)}
                min={0}
                max={20}
                step={0.5}
                className="mt-2"
                data-testid="margin-slider"
              />
            </div>
          </section>

          <Separator />

          {/* Layouts */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Acomodo automático
            </p>

            {ineMode && (
              <div
                data-testid="ine-mode-panel"
                className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 mb-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-blue-700" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">
                    Credenciales INE
                  </p>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                  Arrastra una foto del frente y otra del reverso, o usa una
                  sola y la duplicamos. Las recortaremos al tamaño real (85.6 ×
                  54 mm) y aplicaremos filtro escáner automáticamente.
                </p>
                <Button
                  size="sm"
                  onClick={applyIneLayout}
                  data-testid="layout-ine"
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white"
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Acomodar como
                  INE (frente + reverso)
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <LayoutBtn
                icon={Sparkles}
                label="Auto-fit"
                testid="layout-auto"
                onClick={() => applyLayout("auto")}
              />
              <LayoutBtn
                icon={SplitSquareHorizontal}
                label="Media hoja"
                testid="layout-half"
                onClick={() => applyLayout("half")}
              />
              <LayoutBtn
                icon={Grid2x2}
                label="2 × 2"
                testid="layout-2x2"
                onClick={() => applyLayout("2x2")}
              />
              <LayoutBtn
                icon={Grid3x3}
                label="3 × 3"
                testid="layout-3x3"
                onClick={() => applyLayout("3x3")}
              />
              <LayoutBtn
                icon={LayoutGrid}
                label="4 × 4"
                testid="layout-4x4"
                onClick={() => applyLayout("4x4")}
              />
              <Button
                variant="outline"
                onClick={clearCanvas}
                data-testid="clear-canvas-button"
                className="h-auto flex-col py-3 gap-1.5 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-700"
              >
                <Eraser className="h-5 w-5" />
                <span className="text-[11px] font-medium">Vaciar hoja</span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              Los layouts respetan siempre la proporción original de cada
              imagen. Si necesitas que llenen el cuadro, usa <b>Recortar</b>{" "}
              abajo.
            </p>
          </section>

          <Separator />

          {/* Editor selección */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Imagen seleccionada
            </p>
            {!selected && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[12px] text-slate-500">
                Selecciona una imagen en el lienzo para editarla
              </div>
            )}
            {selected && (
              <div className="space-y-3" data-testid="selection-editor">
                <div className="flex gap-2 items-center">
                  {selectedImage && (
                    <img
                      src={selectedImage.src}
                      alt={selectedImage.name}
                      className="h-10 w-10 rounded object-cover border border-slate-200"
                    />
                  )}
                  <div className="text-[12px] flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {selectedImage?.name || "imagen"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedImage?.w}×{selectedImage?.h}px
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!selectedImage) return;
                    const { toast } = await import("sonner");
                    const id = toast.loading("Procesando INE...");
                    try {
                      const result = await processImageAsIne(
                        selectedImage.id,
                      );
                      toast.success(
                        result?.detected
                          ? "INE detectada y recortada automáticamente"
                          : "Filtro aplicado y recortada por proporción INE",
                        { id },
                      );
                    } catch (e) {
                      console.error(e);
                      toast.error("No se pudo procesar como INE", { id });
                    }
                  }}
                  data-testid="process-as-ine-button"
                  className="w-full border-blue-200 text-blue-800 hover:bg-blue-50"
                >
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Procesar como INE
                  (recorte + escáner)
                </Button>

                <div>
                  <label className="text-[11px] text-slate-500">
                    Modo de ajuste
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button
                      size="sm"
                      variant={selected.fit === "contain" ? "default" : "outline"}
                      onClick={() =>
                        updatePlacement(selected.id, { fit: "contain" })
                      }
                      data-testid="fit-contain-button"
                      className={
                        selected.fit === "contain"
                          ? "bg-blue-900 hover:bg-blue-800"
                          : ""
                      }
                    >
                      Ajustar (sin recorte)
                    </Button>
                    <Button
                      size="sm"
                      variant={selected.fit === "cover" ? "default" : "outline"}
                      onClick={() =>
                        updatePlacement(selected.id, { fit: "cover" })
                      }
                      data-testid="fit-cover-button"
                      className={
                        selected.fit === "cover"
                          ? "bg-blue-900 hover:bg-blue-800"
                          : ""
                      }
                    >
                      <Crop className="h-3.5 w-3.5 mr-1" /> Recortar (llenar)
                    </Button>
                  </div>
                </div>

                {selected.fit === "cover" && (
                  <>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                          <ZoomIn className="h-3 w-3" /> Zoom
                        </label>
                        <span className="text-[11px] font-mono text-slate-700">
                          {selected.zoom.toFixed(2)}x
                        </span>
                      </div>
                      <Slider
                        value={[selected.zoom]}
                        onValueChange={([v]) =>
                          updatePlacement(selected.id, { zoom: v })
                        }
                        min={1}
                        max={3}
                        step={0.05}
                        className="mt-2"
                        data-testid="zoom-slider"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500">
                        Desplazamiento horizontal
                      </label>
                      <Slider
                        value={[selected.offsetXPct]}
                        onValueChange={([v]) =>
                          updatePlacement(selected.id, { offsetXPct: v })
                        }
                        min={-50}
                        max={50}
                        step={1}
                        className="mt-2"
                        data-testid="offset-x-slider"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">
                        Desplazamiento vertical
                      </label>
                      <Slider
                        value={[selected.offsetYPct]}
                        onValueChange={([v]) =>
                          updatePlacement(selected.id, { offsetYPct: v })
                        }
                        min={-50}
                        max={50}
                        step={1}
                        className="mt-2"
                        data-testid="offset-y-slider"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updatePlacement(selected.id, {
                        locked: !selected.locked,
                      })
                    }
                    data-testid="lock-toggle-button"
                  >
                    {selected.locked ? (
                      <>
                        <Lock className="h-3.5 w-3.5 mr-1" /> Bloqueada
                      </>
                    ) : (
                      <>
                        <LockOpen className="h-3.5 w-3.5 mr-1" /> Libre
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resetPlacement(selected.id)}
                    data-testid="reset-edit-button"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Resetear
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removePlacement(selected.id)}
                  data-testid="delete-placement-button"
                  className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Quitar del lienzo
                </Button>
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
