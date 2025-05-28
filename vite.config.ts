// vite.config.ts
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  worker: {
    format: "es",
    plugins: () => [wasm(), topLevelAwait()],
  },
  optimizeDeps: {
    exclude: ["@hyzyla/pdfium"],
  },
  build: {
    target: "esnext",
  },
  assetsInclude: ["**/*.wasm", "**/*.pdf"],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: [".."],
    },
    // Configure proper MIME types
    headers: {
      "*.pdf": {
        "Content-Type": "application/pdf",
      },
    },
  },
});
