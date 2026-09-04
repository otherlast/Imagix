import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Evita problemas de sintaxis con importaciones de JSX
      jsxRuntime: "automatic",
    }),
  ],
  // Define la subruta base si accedes a través de http://localhost/Imagix/
  base: "/Imagix/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Corrige las conexiones WebSocket/HMR para evitar el bucle de "server connection lost"
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
  },
});