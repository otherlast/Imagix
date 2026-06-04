// Genera un thumbnail comprimido (JPEG ~85%) a un tamaño máximo en px.
// Acepta un dataURL/URL y devuelve dataURL del thumbnail.
export function makeThumbnail(src, maxSize = 240) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      let w, h;
      if (img.naturalWidth > img.naturalHeight) {
        w = Math.min(maxSize, img.naturalWidth);
        h = w / ratio;
      } else {
        h = Math.min(maxSize, img.naturalHeight);
        w = h * ratio;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

// Comprime una imagen grande para uso en el lienzo (mantiene calidad alta
// pero limita el tamaño máximo a 2000px de lado largo).
export function compressForCanvas(src, maxSize = 2000, quality = 0.92) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const ratio = w / h;
      if (Math.max(w, h) <= maxSize) {
        // No hace falta comprimir
        resolve({ src, w, h });
        return;
      }
      if (w > h) {
        w = maxSize;
        h = Math.round(w / ratio);
      } else {
        h = maxSize;
        w = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ src: canvas.toDataURL("image/jpeg", quality), w, h });
    };
    img.onerror = () => resolve({ src, w: 0, h: 0 });
    img.src = src;
  });
}
