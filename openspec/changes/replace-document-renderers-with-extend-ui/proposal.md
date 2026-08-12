## Why

The current document renderers are independently implemented on pdf.js, docx-preview, SheetJS, and Pagus. That duplicates viewer behavior and prevents the package from using Extend UI's maintained document-rendering stack. The replacement must preserve the package's content-driven source contract and its external PDF/PPTX navigation semantics, while remaining usable in air-gapped deployments.

## What Changes

- Replace the internal PDF renderer with an EmbedPDF-based adapter selected from the Extend UI stack. Package the PDFium WASM and worker assets with the library so PDF rendering makes no runtime CDN request.
- Replace the DOCX/DOTX renderer with an internal adapter over pinned `@extend-ai/react-docx` primitives.
- Replace the XLSX/XLS renderer with an internal adapter over pinned `@extend-ai/react-xlsx` primitives, retaining FileViewer-owned workbook sheet controls.
- Replace the CSV path with a client-only internal adapter over Extend UI's CSV stack. It will decode the already-buffered blob to text before rendering and preserve SSR-safe package import.
- Replace the Pagus PPTX/POTX renderer with an internal adapter over pinned `@extend-ai/react-pptx` primitives. Vendor toolbars and thumbnail rails will be disabled; FileViewer remains the sole chrome and navigation owner.
- Preserve the public `FileViewer` source, detection, fallback, error, and chrome contracts. PDF and PPTX `setPage` commands from external chrome will continue to drive the underlying scroll surface and notify subscribers only when the latest programmatic navigation settles.
- Update package documentation, test fixtures, dependencies, and architectural invariants for the Extend-based rendering stack.

## Capabilities

### New Capabilities

- `spreadsheet-renderer`: Render buffered XLSX/XLS workbooks and CSV text through internal Extend-based adapters while retaining FileViewer-owned sheet and error state.
- `offline-renderer-assets`: Package and resolve renderer-owned runtime assets locally so supported rendering works without external CDN access.

### Modified Capabilities

- `pdf-renderer`: Replace the pdf.js implementation while preserving PDF loading, continuous-scroll, zoom, error, and FileViewer chrome behavior.
- `docx-renderer-layout`: Replace docx-preview rendering and its correction pass with an Extend DOCX rendering path that preserves the supported DOCX/DOTX layout guarantees.
- `pptx-renderer`: Replace the pinned Pagus implementation with a pinned Extend presentation stack, preserving static PPTX/POTX preview and external navigation.
- `package-distribution`: Include every renderer-owned worker, WASM, stylesheet, and client-only loading boundary in the installed package artifact.

## Impact

- `packages/file-viewer/package.json` and `pnpm-lock.yaml`: remove pdf.js, docx-preview, SheetJS, and Pagus dependencies; add pinned Extend renderer packages and their minimal direct runtime dependencies.
- `packages/file-viewer/src/renderers/`: replace `PdfRenderer`, `DocxRenderer`, `PptxRenderer`, and `SpreadsheetRenderer` internals; add focused adapters and runtime-asset helpers as needed.
- `packages/file-viewer/src/FileViewer.tsx`, types, default chrome, and tests: preserve renderer routing and bridge existing PDF/PPTX/sheet chrome state to the new renderer control APIs.
- `packages/file-viewer/vite.config.ts`, styles, build verification, and README: emit local assets, preserve SSR-safe import, document zero-runtime-CDN behavior, and include required vendor styles without host copying.
- `docs/invariants.md`, `docs/architecture.md`, and `docs/decisions.md`: replace the Pagus-only PPTX constraint and record the Extend-based renderer and offline-asset rules.
