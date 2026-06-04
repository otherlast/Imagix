import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { sheetDimsMm, EXPORT_PX_PER_MM } from "./sheet";

async function rasterize(node, paper) {
  const { widthMm, heightMm } = sheetDimsMm(paper.size, paper.orientation);
  const targetW = Math.round(widthMm * EXPORT_PX_PER_MM);
  const rect = node.getBoundingClientRect();
  const scale = targetW / rect.width;
  // Mark exporting state to hide UI overlays
  document.body.setAttribute("data-exporting", "true");
  try {
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
  } finally {
    document.body.removeAttribute("data-exporting");
  }
}

export async function exportToPDF(node, paper, filename = "papeleria.pdf") {
  const { canvas, widthMm, heightMm } = await rasterize(node, paper);
  const orientation =
    paper.orientation === "landscape" ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: [widthMm, heightMm],
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  pdf.addImage(imgData, "JPEG", 0, 0, widthMm, heightMm);
  pdf.save(filename);
}

export async function exportToImage(
  node,
  paper,
  format = "png",
  filename = "papeleria",
) {
  const { canvas } = await rasterize(node, paper);
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const dataUrl = canvas.toDataURL(mime, 0.95);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
