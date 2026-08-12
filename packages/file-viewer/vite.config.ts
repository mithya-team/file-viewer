import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    // PDFium must be emitted as a URL-addressable package asset. Inlining it
    // would hide a multi-megabyte WASM binary in JS and defeat offline-asset
    // verification for consumers that install the library.
    assetsInlineLimit: 0,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    minify: false,
    rollupOptions: {
      external: [
        /^react(?:\/.*)?$/,
        /^react-dom(?:\/.*)?$/,
        /^@embedpdf\/pdfium\/pdfium\.wasm\?url&no-inline$/,
      ],
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
    target: "es2022",
  },
  worker: {
    format: "es",
  },
});
