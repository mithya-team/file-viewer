## 1. Renderer-stack foundation

- [x] 1.1 Verify the pinned Extend-stack package exports and peer dependencies against the package manager before changing the library manifest.
- [x] 1.2 Replace pdf.js, docx-preview, SheetJS, and Pagus runtime dependencies with the minimal pinned EmbedPDF, Extend DOCX, Extend XLSX, Extend PPTX, CSV parser/grid, and PDFium asset dependencies; update the lockfile.
- [ ] 1.3 Add internal shared helpers for renderer-owned object URLs, normalized errors, and source-change disposal without changing FileViewer's public source contract.
- [x] 1.4 Update Vite/package build configuration to emit package-owned PDF worker/WASM assets and required third-party styles in the installable artifact.
- [x] 1.5 Add built-artifact checks that require the locally resolved PDF worker/WASM assets and required style output.

## 2. SSR and offline runtime boundaries

- [x] 2.1 Implement an internal PDF engine loader that resolves PDFium from a Vite-emitted local package asset and never hardcodes a CDN URL.
- [x] 2.2 Add an internal client-only loading boundary for the Glide CSV renderer so the package entry remains SSR-safe.
- [x] 2.3 Route required CSV vendor CSS through the existing package style/build entry without adding a consumer `public`-asset step.
- [x] 2.4 Add SSR import smoke coverage proving that package import does not evaluate browser globals, PDF workers, or Glide Data Grid.
- [ ] 2.5 Add browser/integration coverage that denies external network access and verifies a PDF still opens from package-owned assets.

## 3. PDF adapter and chrome bridge

- [x] 3.1 Replace pdf.js document loading and rendering with an internal EmbedPDF adapter that accepts the normalized PDF blob and retains validation/error messages for undersized or invalid headers.
- [x] 3.2 Disable EmbedPDF vendor toolbar, upload/download controls, and thumbnails; retain FileViewer default/custom chrome as the only control surface.
- [x] 3.3 Bridge EmbedPDF document-load, active-page, viewport-ready, and controlled-zoom events to the existing PdfRenderer/FileViewer callbacks and state.
- [x] 3.4 Implement PDF `navIntent` handling through the imperative page-scroll API, including same-page re-jumps and latest-request-wins settled navigation notification.
- [x] 3.5 Map existing `PdfRendererProps` search query, state, active result, and page-request callbacks to EmbedPDF search behavior; preserve exported search types.
- [ ] 3.6 Replace pdf.js-specific renderer tests with adapter, continuous-scroll, search, zoom, error, and offline-asset integration coverage.

## 4. PPTX adapter and external navigation

- [x] 4.1 Replace the Pagus parse/SVG renderer with an internal pinned `@extend-ai/react-pptx` adapter that consumes normalized PPTX/POTX data.
- [x] 4.2 Configure the Extend PPTX primitive for continuous scroll, static preview, no vendor toolbar, and no thumbnail rail.
- [x] 4.3 Bridge presentation load, ready, active-slide, and controlled-zoom events to the existing PptxRenderer/FileViewer state and chrome API.
- [x] 4.4 Implement `navIntent` via the PPTX controller's slide navigation API, preserving queued early requests, same-slide re-jumps, and latest-request-wins settle events.
- [ ] 4.5 Add PPTX/POTX tests for externally controlled navigation, user-scroll page reporting, thumbnails disabled, static behavior, source replacement, and render fallback.

## 5. DOCX and spreadsheet adapters

- [x] 5.1 Replace docx-preview and its layout-correction helpers with an internal pinned `@extend-ai/react-docx` adapter over a normalized in-memory file.
- [ ] 5.2 Verify DOCX/DOTX fixtures retain anchored images, right-aligned header images, and behind-document backgrounds; report renderer failures through FileViewer fallback.
- [x] 5.3 Implement the workbook branch with `@extend-ai/react-xlsx` primitives, buffered workbook data, FileViewer-owned sheet names, and bidirectional active-sheet control.
- [ ] 5.4 Validate XLSX and legacy XLS fixtures before deleting the SheetJS path; preserve render fallback for a detected workbook that cannot be parsed.
- [x] 5.5 Implement the CSV branch to decode normalized blobs with BOM/charset handling, dynamically load the client grid, and keep vendor toolbar/upload/download controls absent.
- [ ] 5.6 Add CSV coverage for URL, Blob, base64, and stream source modes, decoding failures, SSR-safe import, no sheet chrome, and parser/render fallback.

## 6. Compatibility, documentation, and release validation

- [x] 6.1 Update `FileViewer`, default chrome, renderer prop types, and exports only as needed to preserve all existing public source, fallback, download, sheet, PDF, and PPTX contracts.
- [x] 6.2 Remove superseded renderer helpers, dependencies, worker handling, tests, and documentation only after their replacement coverage passes.
- [x] 6.3 Update `docs/invariants.md`, architecture, decisions, and README to require the pinned Extend rendering stack, local PDF assets, disabled vendor thumbnails/chrome, and CSV client boundary; remove the Pagus rule.
- [x] 6.4 Update the demo to exercise Extend-based PDF, DOCX, XLSX/XLS, CSV, and PPTX/POTX paths across supported source modes and external PDF/PPTX page commands.
- [ ] 6.5 Run focused renderer tests, full package tests, typecheck, package build, `verify-dist`, and built-artifact/demo smoke tests; record any unverified browser-engine behavior before release.
