import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

// Tauri attend un port fixe et ne doit pas masquer les erreurs Rust dans la console.
export default defineConfig({
  base: "./",
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  // une seule source pour la version : package.json (tauri.conf.json le lit aussi)
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: "es2022",
    // deux pages : l'app, et la barre en jeu (fenêtre « overlay », RAG-82)
    rollupOptions: { input: { main: "index.html", overlay: "overlay.html" } },
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
