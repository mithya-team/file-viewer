import type { PdfEngine } from "@embedpdf/models";

/**
 * Creates the browser-only EmbedPDF engine with a Vite-emitted PDFium asset.
 *
 * EmbedPDF's sample viewer points at jsDelivr by default. Importing the WASM
 * from this package's artifact makes the asset part of the installation, so a
 * deployed FileViewer does not need a CDN to open a PDF. `fontFallback: null`
 * also opts out of EmbedPDF's optional remote fallback-font configuration.
 */
export async function loadEmbedPdfEngine(): Promise<PdfEngine<Blob>> {
  if (typeof window === "undefined") {
    throw new Error("PDF rendering is only available in a browser.");
  }

  const { createPdfiumEngine } = await import(
    "@embedpdf/engines/pdfium-worker-engine"
  );
  // This import intentionally survives this package's library build. The
  // consumer's Vite build resolves the asset from the installed PDFium package
  // and emits an origin-relative URL, avoiding Vite dev's `file:` dependency
  // optimization behavior and any runtime CDN dependency.
  const { default: pdfiumWasmUrl } = await import(
    "@embedpdf/pdfium/pdfium.wasm?url&no-inline"
  );
  // Vite returns a root-relative URL in dev (`/@fs/...`) and production
  // (`/assets/...`). EmbedPDF fetches this from a Blob worker, whose base URL
  // is not the application document, so make the package-local asset absolute
  // before passing it to the engine.
  const absolutePdfiumWasmUrl = new URL(pdfiumWasmUrl, window.location.href).href;
  // The worker engine currently reports WASM initialization failures as a
  // `wasmError` message that its main-thread executor does not surface. Probe
  // the asset here so a missing/blocked file rejects the renderer instead of
  // leaving document tasks pending forever.
  const response = await fetch(absolutePdfiumWasmUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to load PDFium WASM (${response.status}${response.statusText ? ` ${response.statusText}` : ""}).`,
    );
  }
  return createPdfiumEngine(absolutePdfiumWasmUrl, { fontFallback: null });
}
