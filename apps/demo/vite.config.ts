import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: {
    alias: {
      "@file-viewer/react": fileURLToPath(new URL("../../packages/file-viewer/src/index.ts", import.meta.url)),
    },
  },
  plugins: [react(), tailwindcss()],
});
