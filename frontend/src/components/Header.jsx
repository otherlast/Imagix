import { useRef } from "react";
import {
  Scissors,
  Magnet,
  Trash2,
  FileDown,
  ImageDown,
  Printer,
  Layers,
  CreditCard,
} from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { usePrinter } from "../store/PrinterContext";
import { exportToPDF, exportToImage } from "../lib/exportSheet";
import { toast } from "sonner";

export default function Header({ sheetRef }) {
  const {
    guillotine,
    setGuillotine,
    snapToGrid,
    setSnapToGrid,
    clearAll,
    placements,
    paper,
    exportGuillotine,
    setExportGuillotine,
    ineMode,
    setIneMode,
  } = usePrinter();
  const exporting = useRef(false);

  const doExport = async (type) => {
    if (exporting.current) return;
    if (!sheetRef?.current) return;
    const nodes = sheetRef.current.getSheetNodes?.() || [];
    if (nodes.length === 0) {
      toast.error("No hay hojas para exportar");
      return;
    }
    exporting.current = true;
    const restoreGuillotine = guillotine;
    try {
      if (exportGuillotine !== guillotine) setGuillotine(exportGuillotine);
      await new Promise((r) => setTimeout(r, 80));
      const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      if (type === "pdf") {
        await exportToPDF(nodes, paper, `papeleria-${ts}.pdf`);
        toast.success(
          nodes.length > 1
            ? `PDF de ${nodes.length} hojas exportado`
            : "PDF exportado",
        );
      } else {
        await exportToImage(nodes, paper, type, `papeleria-${ts}`);
        toast.success(
          nodes.length > 1
            ? `${nodes.length} ${type.toUpperCase()} exportados`
            : `${type.toUpperCase()} exportado`,
        );
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al exportar");
    } finally {
      if (exportGuillotine !== restoreGuillotine)
        setGuillotine(restoreGuillotine);
      exporting.current = false;
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header
        data-testid="app-header"
        className="h-14 flex items-center justify-between px-4 border-b border-slate-200 bg-white/85 backdrop-blur-md z-50 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-900 text-white grid place-items-center shadow-sm">
            <Printer className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <h1 className="font-display text-base font-bold text-slate-900">
              Papelería · Acomodo
            </h1>
            <p className="text-[11px] text-slate-500 -mt-0.5">
              Herramienta de impresión profesional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`tool-button flex items-center gap-2 rounded-lg border px-3 h-9 cursor-pointer ${
                  ineMode
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setIneMode(!ineMode)}
                data-testid="ine-mode-toggle"
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Modo INE</span>
                <Switch
                  checked={ineMode}
                  onCheckedChange={setIneMode}
                  className="data-[state=checked]:bg-blue-700"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Recorta INEs automáticamente y aplica filtro escáner
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`tool-button flex items-center gap-2 rounded-lg border px-3 h-9 cursor-pointer ${
                  guillotine
                    ? "bg-purple-50 border-purple-200 text-purple-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setGuillotine(!guillotine)}
                data-testid="guillotine-mode-toggle"
              >
                <Scissors className="h-4 w-4" />
                <span className="text-sm font-medium">Modo guillotina</span>
                <Switch
                  checked={guillotine}
                  onCheckedChange={setGuillotine}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>Marcas de corte alrededor de cada imagen</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={snapToGrid ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSnapToGrid(!snapToGrid)}
                data-testid="snap-grid-toggle"
                className="h-9"
              >
                <Magnet className="h-4 w-4 mr-1.5" /> Snap
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ajustar a cuadrícula</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (
                placements.length > 0 &&
                !window.confirm("¿Eliminar todo del lienzo y las imágenes?")
              )
                return;
              clearAll();
              toast("Lienzo limpiado");
            }}
            data-testid="clear-all-button"
            className="h-9 text-slate-600 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Limpiar todo
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white h-9 ml-1 shadow-sm"
                data-testid="export-button"
              >
                <FileDown className="h-4 w-4 mr-1.5" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-xs">
                Formato de exportación
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => doExport("pdf")}
                data-testid="export-pdf-button"
              >
                <FileDown className="h-4 w-4 mr-2" /> Exportar PDF (300 DPI)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => doExport("png")}
                data-testid="export-png-button"
              >
                <ImageDown className="h-4 w-4 mr-2" /> Exportar PNG
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => doExport("jpg")}
                data-testid="export-jpg-button"
              >
                <ImageDown className="h-4 w-4 mr-2" /> Exportar JPG
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">Marcas de corte</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setExportGuillotine(!exportGuillotine)}
                data-testid="export-guillotine-toggle"
              >
                <Layers className="h-4 w-4 mr-2" />
                {exportGuillotine ? "Exportar SIN marcas" : "Exportar CON marcas"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}
