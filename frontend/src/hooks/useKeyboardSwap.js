import { useEffect } from "react";

// Encuentra la imagen más cercana en la dirección de la tecla presionada
function getNearestInDirection(current, placements, key) {
  if (!current || !placements?.length) return null;

  // Centro de la imagen seleccionada
  const cx = current.xPct + (current.wPct || 0) / 2;
  const cy = current.yPct + (current.hPct || 0) / 2;

  let nearest = null;
  let minDistance = Infinity;

  placements.forEach((target) => {
    // Solo comparar con imágenes de la misma página que no estén bloqueadas
    if (
      target.id === current.id ||
      target.locked ||
      (target.pageIndex ?? 0) !== (current.pageIndex ?? 0)
    ) {
      return;
    }

    // Centro de la imagen candidata
    const tx = target.xPct + (target.wPct || 0) / 2;
    const ty = target.yPct + (target.hPct || 0) / 2;

    const dx = tx - cx;
    const dy = ty - cy;

    // Cono de validación por cuadrante espacial
    const inDirection =
      (key === "ArrowRight" && dx > 0 && Math.abs(dx) >= Math.abs(dy) * 0.4) ||
      (key === "ArrowLeft" && dx < 0 && Math.abs(dx) >= Math.abs(dy) * 0.4) ||
      (key === "ArrowDown" && dy > 0 && Math.abs(dy) >= Math.abs(dx) * 0.4) ||
      (key === "ArrowUp" && dy < 0 && Math.abs(dy) >= Math.abs(dx) * 0.4);

    if (inDirection) {
      const dist = Math.hypot(dx, dy);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = target;
      }
    }
  });

  return nearest;
}

export function useKeyboardSwap({ selectedId, placements, updatePlacement, commit }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl?.tagName) ||
        activeEl?.isContentEditable
      ) {
        return;
      }

      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!keys.includes(e.key) || !selectedId) return;

      const current = placements.find((p) => p.id === selectedId);
      if (!current) return;

      const target = getNearestInDirection(current, placements, e.key);

      if (target) {
        e.preventDefault();
        commit?.(); // Guardar en historial antes de modificar

        // Intercambio completo de coordenadas (Porcentajes y Milímetros si existen)
        updatePlacement(current.id, {
          xPct: target.xPct,
          yPct: target.yPct,
          xMm: target.xMm,
          yMm: target.yMm,
        });

        updatePlacement(target.id, {
          xPct: current.xPct,
          yPct: current.yPct,
          xMm: current.xMm,
          yMm: current.yMm,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, placements, updatePlacement, commit]);
}