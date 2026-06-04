# Papelería · Acomodo

Herramienta interna tipo "mini Canva especializado" para acomodar e imprimir
imágenes en hojas tamaño Carta u Oficio. 100% frontend.

## Stack

- **React 18** + **Vite 5** (sin Create React App)
- **TailwindCSS 3** + **PostCSS** + **Autoprefixer**
- **shadcn/ui** (Radix Primitives) y **lucide-react**
- **html2canvas** + **jsPDF** para exportación a 300 DPI

## Requisitos

- Node.js 18 o superior
- Yarn 1.x (recomendado) o npm

## Scripts

```bash
yarn install        # instalar dependencias
yarn dev            # arrancar en modo desarrollo (http://localhost:3000)
yarn start          # alias de dev (mismo comando)
yarn build          # build de producción → ./dist
yarn preview        # servir el build
```

## Estructura

```
frontend/
├── index.html                # entrypoint Vite
├── vite.config.js            # configuración Vite + alias "@"
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx              # bootstrap React
│   ├── App.jsx
│   ├── index.css             # tailwind base + variables CSS
│   ├── components/
│   │   ├── PrinterApp.jsx
│   │   ├── Header.jsx
│   │   ├── LeftSidebar.jsx
│   │   ├── RightSidebar.jsx
│   │   ├── Canvas.jsx
│   │   ├── ImageBox.jsx
│   │   └── ui/               # componentes shadcn/ui
│   ├── store/
│   │   └── PrinterContext.jsx
│   └── lib/
│       ├── sheet.js          # dimensiones de hojas
│       ├── layouts.js        # cálculo de cuadrículas
│       ├── exportSheet.js    # exportación PDF/PNG
│       └── utils.js
```

## Despliegue en GitHub Pages

1. Añade en `package.json` el campo `"homepage"`:

   ```json
   "homepage": "https://tu-usuario.github.io/papeleria-acomodo/"
   ```

2. Añade en `vite.config.js` la base path:

   ```js
   export default defineConfig({
     base: "/papeleria-acomodo/",
     // ...resto
   });
   ```

3. Instala `gh-pages` y despliega:

   ```bash
   yarn add -D gh-pages
   yarn build
   npx gh-pages -d dist
   ```

## Atajos de teclado

- `Ctrl/Cmd + V` — pegar imagen del portapapeles del sistema
- `Ctrl/Cmd + C` — copiar la imagen seleccionada (paste interno con Ctrl/Cmd+V)
- `G` — activar/desactivar Modo guillotina
- `Delete` / `Backspace` — eliminar la imagen seleccionada del lienzo
- `Esc` — deseleccionar
- `Shift` + arrastrar handle — mantener proporción al redimensionar

## Regla crítica

Las imágenes **nunca** se deforman. El modo "Recortar (llenar)" es la única
excepción y se activa de forma intencional por el usuario para que la imagen
llene el cuadro (con zoom y desplazamiento manuales).
