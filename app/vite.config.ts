import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri attend un port fixe et ne doit pas masquer les erreurs Rust dans la console.
export default defineConfig({
  base: "./",
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
