import { useEffect, useCallback } from "react";
import {
  Grid2x2, Grid3x3, LayoutGrid, Sparkles, SplitSquareHorizontal, RotateCcw,
  Lock, LockOpen, Trash2, ZoomIn, Crop, Eraser, CreditCard, Wand2, Maximize2,
  Copy, PlusCircle, Grid, ArrowUp, ArrowDown, RotateCw,
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { usePrinter } from "../store/PrinterContext";
import { SHEET_SIZES } from "../lib/sheet";
import { toast } from "sonner";

// --- COMPONENTES AUXILIARES ---
const SectionHeader = ({ title }) => (
  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">{title}</p>
);

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

// --- HOOK PERSONALIZADO CON LA LÓGICA ---
function usePlacementActions() {
  const ctx = usePrinter();
  const { selectedId, placements, images, updatePlacement, placeImage, addPage, paper } = ctx;

  const selected = placements.find((p) => p.id === selectedId);
  const selectedImage = selected ? images.find((i) => i.id === selected.imageId) : null;

  // Intercambiar posiciones
  const swapPlacements = useCallback((idx1, idx2) => {
    if (idx1 < 0 || idx2 < 0 || idx1 >= placements.length || idx2 >= placements.length) return;
    const p1 = placements[idx1], p2 = placements[idx2];

    updatePlacement(p1.id, { xPct: p2.xPct, yPct: p2.yPct, wPct: p2.wPct, hPct: p2.hPct, pageIndex: p2.pageIndex || 0 });
    updatePlacement(p2.id, { xPct: p1.xPct, yPct: p1.yPct, wPct: p1.wPct, hPct: p1.hPct, pageIndex: p1.pageIndex || 0 });
    toast.success("Posiciones intercambiadas");
  }, [placements, updatePlacement]);

  const handleSwap = (dir) => {
    if (!selectedId) return toast.error("Selecciona una foto primero");
    const idx = placements.findIndex((p) => p.id === selectedId);
    if (idx !== -1) swapPlacements(idx, dir === "next" ? idx + 1 : idx - 1);
  };

  // Rotar
  const handleRotate = () => {
    if (!selected) return;
    const newRot = ((selected.rotation || 0) + 90) % 360;
    updatePlacement(selected.id, { rotation: newRot });
    toast.success(`Rotado a ${newRot}°`);
  };

  // 6 Fotos Infantil
  const handle6Infantil = () => {
    if (!images?.length) return toast.error("Sube al menos una imagen");
    const targetImg = selectedImage || images[0];
    const sz = SHEET_SIZES[paper.size] || { widthMm: 215.9, heightMm: 279.4 };
    const isLand = paper.orientation === "landscape";
    const [sheetW, sheetH] = isLand ? [sz.heightMm, sz.widthMm] : [sz.widthMm, sz.heightMm];

    const wPct = (25 / sheetW) * 100, hPct = (30 / sheetH) * 100, gap = 1.2;
    for (let i = 0; i < 6; i++) {
      placeImage(targetImg.id, {
        xPct: 4 + i * (wPct + gap), yPct: 8, wPct, hPct, pageIndex: selected?.pageIndex || 0,
      });
    }
    toast.success("6 fotos Infantil acomodadas");
  };

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e) => {
      if (!selectedId || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      const idx = placements.findIndex((p) => p.id === selectedId);
      if (idx === -1) return;
      if (["ArrowUp", "ArrowLeft"].includes(e.key)) { e.preventDefault(); swapPlacements(idx, idx - 1); }
      if (["ArrowDown", "ArrowRight"].includes(e.key)) { e.preventDefault(); swapPlacements(idx, idx + 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, placements, swapPlacements]);

  return { ...ctx, selected, selectedImage, handleSwap, handleRotate, handle6Infantil };
}

// --- COMPONENTE PRINCIPAL ---
export default function RightSidebar() {
  const {
    paper, setPaper, marginMm, setMarginMm, applyLayout, clearCanvas, selectedId,
    selected, selectedImage, updatePlacement, removePlacement, resetPlacement,
    ineMode, applyIneLayout, processImageAsIne, duplicateSelected, addPage,
    handleSwap, handleRotate, handle6Infantil,
  } = usePlacementActions();

  return (
    <aside data-testid="right-sidebar" className="w-80 bg-white border-l border-slate-200 flex flex-col z-40 shrink-0">
      <ScrollArea className="flex-1 scrollbar-clean">
        <div className="p-4 space-y-5">
          {/* Configuración de Hoja */}
          <section>
            <SectionHeader title="Hoja de impresión" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">Tamaño</label>
                <Select value={paper.size} onValueChange={(v) => setPaper({ ...paper, size: v })}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(SHEET_SIZES).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label} ({s.widthMm.toFixed(0)}×{s.heightMm.toFixed(0)}mm)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Orientación</label>
                <Select value={paper.orientation} onValueChange={(v) => setPaper({ ...paper, orientation: v })}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Vertical</SelectItem>
                    <SelectItem value="landscape">Horizontal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Margen</span><span className="font-mono text-slate-700">{marginMm.toFixed(1)} mm</span>
              </div>
              <Slider value={[marginMm]} onValueChange={([v]) => setMarginMm(v)} min={0} max={20} step={0.5} className="mt-2" />
            </div>
          </section>

          <Separator />

          {/* Automatizaciones */}
          <section>
            <SectionHeader title="Automatizaciones & Pad" />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={() => { addPage?.(); toast.success("Página agregada"); }} className="h-9 gap-1.5 text-[11px] border-blue-200 text-blue-900 hover:bg-blue-50">
                <PlusCircle className="h-4 w-4 text-blue-600" /> Agregar página
              </Button>
              <Button variant="outline" size="sm" onClick={handle6Infantil} className="h-9 gap-1.5 text-[11px] border-purple-200 text-purple-900 hover:bg-purple-50">
                <Grid className="h-4 w-4 text-purple-600" /> 6 Infantil
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 block mb-1.5">Intercambiar posición (o flechas ↑ ↓)</span>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" disabled={!selectedId} onClick={() => handleSwap("prev")} className="h-8 gap-1 text-[11px]">
                  <ArrowUp className="h-3.5 w-3.5" /> Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={!selectedId} onClick={() => handleSwap("next")} className="h-8 gap-1 text-[11px]">
                  <ArrowDown className="h-3.5 w-3.5" /> Siguiente
                </Button>
              </div>
            </div>
          </section>

          <Separator />

          {/* Grid Layouts */}
          <section>
            <SectionHeader title="Acomodo automático" />
            {ineMode && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 mb-3 text-[11px]">
                <div className="flex items-center gap-2 mb-1 font-semibold text-blue-800">
                  <CreditCard className="h-3.5 w-3.5" /> Credenciales INE
                </div>
                <p className="text-slate-600 mb-2">Frente y reverso recortados a 85.6 × 54 mm con filtro escáner.</p>
                <Button size="sm" onClick={applyIneLayout} className="w-full bg-blue-900 hover:bg-blue-800 text-white">
                  Acomodar INE (frente + reverso)
                </Button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <LayoutBtn icon={Maximize2} label="Una x hoja" onClick={() => applyLayout("full")} />
              <LayoutBtn icon={Sparkles} label="Auto-fit" onClick={() => applyLayout("auto")} />
              <LayoutBtn icon={SplitSquareHorizontal} label="Media hoja" onClick={() => applyLayout("half")} />
              <LayoutBtn icon={Grid2x2} label="2 × 2" onClick={() => applyLayout("2x2")} />
              <LayoutBtn icon={Grid3x3} label="3 × 3" onClick={() => applyLayout("3x3")} />
              <LayoutBtn icon={LayoutGrid} label="4 × 4" onClick={() => applyLayout("4x4")} />
              <Button variant="outline" onClick={clearCanvas} className="h-auto flex-col py-3 gap-1.5 hover:bg-red-50 hover:text-red-700 col-span-3">
                <Eraser className="h-5 w-5" /><span className="text-[11px]">Vaciar hojas</span>
              </Button>
            </div>
          </section>

          <Separator />

          {/* Editor de Selección */}
          <section>
            <SectionHeader title="Imagen seleccionada" />
            {!selected ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[12px] text-slate-500">
                Selecciona una imagen en el lienzo para editarla
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  {selectedImage && <img src={selectedImage.thumb || selectedImage.src} alt="" className="h-10 w-10 rounded object-cover border" />}
                  <div className="text-[12px] min-w-0">
                    <p className="font-medium truncate">{selectedImage?.name}</p>
                    <p className="text-[11px] text-slate-500">{selectedImage?.w}×{selectedImage?.h}px</p>
                  </div>
                </div>

                <Button size="sm" variant="outline" onClick={() => processImageAsIne(selectedImage.id)} className="w-full border-blue-200 text-blue-800 hover:bg-blue-50">
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Procesar como INE
                </Button>

                {/* Modos de Ajuste */}
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant={selected.fit === "contain" ? "default" : "outline"} onClick={() => updatePlacement(selected.id, { fit: "contain" })}>
                    Ajustar
                  </Button>
                  <Button size="sm" variant={selected.fit === "cover" ? "default" : "outline"} onClick={() => updatePlacement(selected.id, { fit: "cover" })}>
                    <Crop className="h-3.5 w-3.5 mr-1" /> Recortar
                  </Button>
                </div>

                {/* Controles de Zoom/Offset si está en Recortar (Cover) */}
                {selected.fit === "cover" && (
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><ZoomIn className="h-3 w-3" /> Zoom</span>
                        <span>{(selected.zoom || 1).toFixed(2)}x</span>
                      </div>
                      <Slider value={[selected.zoom || 1]} onValueChange={([v]) => updatePlacement(selected.id, { zoom: v })} min={1} max={3} step={0.05} />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">Offset X / Y</label>
                      <Slider value={[selected.offsetXPct || 0]} onValueChange={([v]) => updatePlacement(selected.id, { offsetXPct: v })} min={-50} max={50} />
                      <Slider value={[selected.offsetYPct || 0]} onValueChange={([v]) => updatePlacement(selected.id, { offsetYPct: v })} min={-50} max={50} className="mt-1" />
                    </div>
                  </div>
                )}

                {/* Botón Rotación */}
                <Button size="sm" variant="outline" onClick={handleRotate} className="w-full">
                  <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Girar 90°
                </Button>

                {/* Botones de Acción Extra */}
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={duplicateSelected}><Copy className="h-3.5 w-3.5 mr-1" /> Duplicar</Button>
                  <Button size="sm" variant="outline" onClick={() => resetPlacement(selected.id)}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>
                  <Button size="sm" variant="outline" onClick={() => updatePlacement(selected.id, { locked: !selected.locked })}>
                    {selected.locked ? <Lock className="h-3.5 w-3.5 mr-1" /> : <LockOpen className="h-3.5 w-3.5 mr-1" />}
                    {selected.locked ? "Bloqueado" : "Libre"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removePlacement(selected.id)} className="text-red-600 border-red-100 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Quitar
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}