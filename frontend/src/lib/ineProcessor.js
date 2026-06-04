// Procesamiento de imágenes para "Modo INE":
// - Detección automática del rectángulo de la credencial (cv.js si está disponible)
// - Recorte por proporción INE 85.6 × 54 mm
// - Filtro "escáner" medio: limpia fondo y mejora contraste

// Proporción real de credencial INE / tarjeta de identificación
export const INE_RATIO = 85.6 / 54; // ≈ 1.585

let cvPromise = null;

export function loadOpenCV() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.cv && window.cv.Mat) return Promise.resolve(window.cv);
  if (cvPromise) return cvPromise;
  cvPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.10.0/opencv.js";
    script.async = true;
    script.onload = () => {
      const wait = () => {
        if (window.cv && window.cv.Mat) {
          resolve(window.cv);
        } else if (window.cv && typeof window.cv.then === "function") {
          window.cv.then(resolve).catch(() => resolve(null));
        } else if (window.cv) {
          // ya cargando — espera un tick
          setTimeout(wait, 50);
        } else {
          setTimeout(wait, 50);
        }
      };
      wait();
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return cvPromise;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Aplica filtro "escáner" medio: contraste alto, blanquea el fondo.
// Usa adjustments simples sobre canvas — sin libs externas.
function applyScannerFilter(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;

  // Paso 1: contraste + brillo + saturación moderada
  const contrast = 1.35; // 1.0 = sin cambio
  const brightness = 12; // suma a cada canal
  const saturation = 0.92; // 1.0 = sin cambio; <1 desatura un poco
  const whiteThreshold = 220; // por encima de esto, push hacia blanco

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i],
      g = d[i + 1],
      b = d[i + 2];

    // contraste
    r = (r - 128) * contrast + 128 + brightness;
    g = (g - 128) * contrast + 128 + brightness;
    b = (b - 128) * contrast + 128 + brightness;

    // saturación
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * saturation;
    g = avg + (g - avg) * saturation;
    b = avg + (b - avg) * saturation;

    // empuje a blanco para fondos claros
    if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
      r = Math.min(255, r + 25);
      g = Math.min(255, g + 25);
      b = Math.min(255, b + 25);
    }

    d[i] = Math.max(0, Math.min(255, r));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Detecta el rectángulo principal del documento usando OpenCV.
// Devuelve {x, y, w, h, angle} en coordenadas de la imagen, o null si no encuentra.
async function detectDocumentRect(image) {
  const cv = await loadOpenCV();
  if (!cv) return null;

  let src, gray, blur, edges, contours, hierarchy;
  try {
    src = cv.imread(image);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    blur = new cv.Mat();
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    edges = new cv.Mat();
    cv.Canny(blur, edges, 50, 150);
    // dilatar para conectar bordes
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, edges, kernel);
    kernel.delete();

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    );

    let bestRect = null;
    let bestScore = 0;
    const totalArea = src.cols * src.rows;
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < totalArea * 0.05) {
        cnt.delete();
        continue;
      }
      // Polygonal approximation
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.rows === 4) {
        const rect = cv.minAreaRect(cnt);
        const w = rect.size.width;
        const h = rect.size.height;
        const ratio = Math.max(w, h) / Math.max(1, Math.min(w, h));
        // INE ratio ~1.585; aceptar entre 1.3 y 1.85
        const ratioScore = 1 - Math.min(1, Math.abs(ratio - INE_RATIO) / 0.5);
        const score = area * (0.4 + 0.6 * ratioScore);
        if (score > bestScore) {
          bestScore = score;
          bestRect = rect;
        }
      }
      approx.delete();
      cnt.delete();
    }

    if (bestRect) {
      return {
        cx: bestRect.center.x,
        cy: bestRect.center.y,
        w: bestRect.size.width,
        h: bestRect.size.height,
        angle: bestRect.angle,
      };
    }
    return null;
  } catch (e) {
    console.warn("detectDocumentRect:", e);
    return null;
  } finally {
    src?.delete();
    gray?.delete();
    blur?.delete();
    edges?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
}

// Recorta la imagen a un rectángulo (cx, cy, w, h, angle en grados) y devuelve canvas
function cropRotatedRect(image, rect) {
  // Asegurar orientación horizontal (la INE es horizontal)
  let { cx, cy, w, h, angle } = rect;
  if (h > w) {
    [w, h] = [h, w];
    angle += 90;
  }
  const outW = Math.round(w);
  const outH = Math.round(h);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  // Trasladamos el origen al centro del canvas, rotamos por -angle,
  // y dibujamos la imagen original desplazando por -cx,-cy.
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((-angle * Math.PI) / 180);
  ctx.drawImage(image, -cx, -cy);
  return canvas;
}

// Crop por proporción INE (sin detección). Centrado en la imagen.
function cropByRatio(image, ratio = INE_RATIO) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  // Asumimos orientación horizontal de salida
  const isLandscape = iw >= ih;
  const ratioH = isLandscape ? ratio : 1 / ratio;
  let cw, ch;
  if (iw / ih > ratioH) {
    ch = ih;
    cw = ch * ratioH;
  } else {
    cw = iw;
    ch = cw / ratioH;
  }
  const cx = (iw - cw) / 2;
  const cy = (ih - ch) / 2;
  // Rotar 90° si la fuente es vertical, para devolver horizontal
  let canvas;
  if (!isLandscape) {
    canvas = document.createElement("canvas");
    canvas.width = ch;
    canvas.height = cw;
    const ctx = canvas.getContext("2d");
    ctx.translate(ch / 2, cw / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(image, cx, cy, cw, ch, -cw / 2, -ch / 2, cw, ch);
  } else {
    canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, cx, cy, cw, ch, 0, 0, cw, ch);
  }
  return canvas;
}

/**
 * Procesa una imagen para Modo INE.
 * @param {string} src dataURL o URL de la imagen original
 * @param {object} options { autoDetect: boolean, applyFilter: boolean }
 * @returns {Promise<{ src: string, w: number, h: number, detected: boolean }>}
 */
export async function processIneImage(src, options = {}) {
  const { autoDetect = true, applyFilter = true } = options;
  const image = await loadImage(src);
  let canvas;
  let detected = false;

  if (autoDetect) {
    const rect = await detectDocumentRect(image);
    if (rect) {
      try {
        canvas = cropRotatedRect(image, rect);
        detected = true;
      } catch (e) {
        canvas = null;
      }
    }
  }

  if (!canvas) {
    canvas = cropByRatio(image, INE_RATIO);
  }

  if (applyFilter) applyScannerFilter(canvas);

  return {
    src: canvas.toDataURL("image/png"),
    w: canvas.width,
    h: canvas.height,
    detected,
  };
}

/**
 * Aplica solo el filtro escáner a una imagen (sin recortar).
 */
export async function applyScannerOnly(src) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  applyScannerFilter(canvas);
  return {
    src: canvas.toDataURL("image/png"),
    w: canvas.width,
    h: canvas.height,
  };
}
