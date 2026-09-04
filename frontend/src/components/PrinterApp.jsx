import { useEffect, useRef } from "react";
import Header from "./Header";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import Canvas from "./Canvas";
import { PrinterProvider, usePrinter } from "../store/PrinterContext";
import { Toaster } from "./ui/sonner";

function ShortcutsAndPasteBinder() {
  const {
    addImageFromSrc,
    copySelected,
    pasteInternal,
    selectedId,
    removePlacement,
    setSelectedId,
    placements,
    setGuillotine,
    guillotine,
    duplicateSelected,
    undo,
    redo,
  } = usePrinter();
  const lastInternalCopy = useRef(0);

useEffect(() => {
    const onPaste = async (e) => {
      const tgt = e.target;
      const isTyping =
        tgt &&
        (tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          tgt.isContentEditable);
      if (isTyping) return;

      const items = e.clipboardData?.items || [];
      let pastedImg = false;

      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          // Prevenimos el comportamiento por defecto y detenemos la propagación
          e.preventDefault();
          e.stopPropagation();

          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              addImageFromSrc(reader.result, `Pegada-${Date.now()}`);
            };
            reader.readAsDataURL(file);
            pastedImg = true;
          }
          break; // Detenemos el loop en la primera imagen para evitar procesar sub-items duplicados
        }
      }

      // Solo si NO se detectó ninguna imagen física en el portapapeles del sistema,
      // intentamos hacer el pegado interno de la app.
      if (!pastedImg) {
        e.preventDefault();
        pasteInternal();
      }
    };

    const onKeyDown = (e) => {
      const tgt = e.target;
      const isTyping =
        tgt &&
        (tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          tgt.isContentEditable);
      if (isTyping) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedId) {
          copySelected();
          lastInternalCopy.current = Date.now();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedId) {
          e.preventDefault();
          duplicateSelected();
        }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removePlacement(selectedId);
      }
      if (e.key === "Escape") {
        setSelectedId(null);
      }
      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey) {
        setGuillotine((prev) => !prev);
      }
    };

    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    addImageFromSrc,
    copySelected,
    pasteInternal,
    selectedId,
    removePlacement,
    setSelectedId,
    setGuillotine,
    guillotine,
    placements,
    duplicateSelected,
    undo,
    redo,
  ]);
  return null;
}

function AppShell() {
  const sheetRef = useRef(null);
  return (
    <div
      data-testid="app-root"
      className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50"
    >
      <Header sheetRef={sheetRef} />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftSidebar />
        <Canvas ref={sheetRef} />
        <RightSidebar />
      </div>
      <ShortcutsAndPasteBinder />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default function PrinterApp() {
  return (
    <PrinterProvider>
      <AppShell />
    </PrinterProvider>
  );
}
