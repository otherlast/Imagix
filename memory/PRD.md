# PRD — Papelería · Acomodo (Mini Canva para Impresión)

## Problema y objetivo
Herramienta web tipo "mini Canva especializado" para uso interno de una papelería: recibir 5-20 imágenes de clientes y organizarlas rápidamente en hojas Carta u Oficio para impresión profesional. Foco en velocidad, precisión y exportación lista para imprenta. Regla crítica: **nunca deformar imágenes** — el aspect ratio siempre se respeta salvo que el usuario active recorte intencional.

## Arquitectura
- Stack: React (CRA) + Tailwind + shadcn/ui + lucide-react.
- Estado: React Context (`PrinterContext`).
- Exportación: `html2canvas` + `jsPDF` a 300 DPI (px/mm = 11.811).
- 100% frontend, sin backend (decisión del usuario).
- Idioma de UI: Español.

## Personas
- Operador de papelería: recibe lotes de imágenes, necesita acomodarlas y exportar rápido para imprimir.

## Funcionalidad implementada (Feb 2026)
- Subida múltiple: drag & drop, file picker, pegado del clipboard (Ctrl+V).
- Miniaturas con borrar, contador, arrastre al lienzo y doble click para colocar.
- Lienzo Carta/Oficio (vertical/horizontal) con guía de margen y dimensiones reales.
- Layouts automáticos: Auto-fit, Media hoja, 2×2, 3×3, 4×4 (respetan aspect ratio con `object-fit: contain`).
- Edición no destructiva por imagen: mover, redimensionar (libre o proporcional con Shift), bloquear, resetear, eliminar.
- Modo Recortar (`object-fit: cover`) con zoom y desplazamientos X/Y.
- Modo guillotina: borde punteado morado alrededor de cada imagen (toggle + atajo `G`).
- Snap-to-grid de 1%.
- Copy/Paste interno (Ctrl+C / Ctrl+V de placement seleccionado).
- Atajos: Delete/Backspace para eliminar, Esc para deseleccionar, G para guillotina.
- Limpiar todo + Vaciar hoja.
- Exportación PDF (recomendado), PNG y JPG a 300 DPI, con opción exportar con o sin marcas de corte.

## Cobertura de pruebas (iteration_1.json)
- 14/14 flujos frontend pasados (100%).
- Confirmado: no hay deformación de imágenes en layouts automáticos.

## Backlog (P0/P1/P2)
- P1 — Recorte tipo crop tool rectangular con drag dentro del frame (más visual que sliders).
- P1 — Reorden por drag&drop entre placements (intercambio).
- P2 — Sangrado (bleed) y guías de troquelado además de guillotina.
- P2 — Guardar plantilla / proyecto reciente en localStorage.
- P2 — Multi-página (varias hojas en cola para imprenta).
- P2 — Bilingüe ES/EN.

## Siguientes acciones (post-MVP)
- Reorder dragover entre dos placements.
- Crop visual interactivo dentro de la caja.
