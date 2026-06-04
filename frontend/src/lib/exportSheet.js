import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { sheetDimsMm, EXPORT_PX_PER_MM } from "./sheet";

async function rasterize(node, paper) {
  const { widthMm, heightMm } = sheetDimsMm(paper.size, paper.orientation);
  const targetW = Math.round(widthMm * EXPORT_PX_PER_MM);
  const rect = node.getBoundingClientRect();
  const scale = targetW / rect.width;
  const canvas = await html2canvas(node, {
    backgroundColor: "#ffffff",
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
  });
  return { canvas, widthMm, heightMm };
}

function setExporting(on) {
  if (on) document.body.setAttribute("data-exporting", "true");
  else document.body.removeAttribute("data-exporting");
}

// Exporta múltiples hojas (nodes) a un PDF multi-página
export async function exportToPDF(nodes, paper, filename = "papeleria.pdf") {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  if (list.length === 0) return;
  setExporting(true);
  try {
    const orientation =
      paper.orientation === "landscape" ? "landscape" : "portrait";
    const first = await rasterize(list[0], paper);
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: [first.widthMm, first.heightMm],
    });
    pdf.addImage(
      first.canvas.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      first.widthMm,
      first.heightMm,
    );
    for (let i = 1; i < list.length; i++) {
      const { canvas, widthMm, heightMm } = await rasterize(list[i], paper);
      pdf.addPage([widthMm, heightMm], orientation);
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        0,
        0,
        widthMm,
        heightMm,
      );
    }
    pdf.save(filename);
  } finally {
    setExporting(false);
  }
}

// Exporta cada hoja a un archivo de imagen separado
export async function exportToImage(
  nodes,
  paper,
  format = "png",
  baseName = "papeleria",
) {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  if (list.length === 0) return;
  setExporting(true);
  try {
    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    for (let i = 0; i < list.length; i++) {
      const { canvas } = await rasterize(list[i], paper);
      const dataUrl = canvas.toDataURL(mime, 0.95);
      const link = document.createElement("a");
      link.href = dataUrl;
      const suffix = list.length > 1 ? `-${String(i + 1).padStart(2, "0")}` : "";
      link.download = `${baseName}${suffix}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Pequeña pausa para que el navegador no agrupe descargas
      await new Promise((r) => setTimeout(r, 200));
    }
  } finally {
    setExporting(false);
  }
}
