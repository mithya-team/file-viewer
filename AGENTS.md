# Project: file-viewer

A React-based file-viewer library that provides a single `FileViewer` component capable of rendering various file formats (images including classical TIFF, spreadsheets, PDFs, Word documents, and text) based on content detection.

## Project Overview

- **Goal:** Export a single `FileViewer` component that abstracts away renderer selection.
- **Key Technology:** React, TypeScript, Tailwind CSS.
- **Design System:** Follows the **Mithya UI registry** pattern (dev-time primitive generation).
- **Architecture:** 
    1. Consumer provides `source` (URL, Blob, or Stream).
    2. Internal `SourceLoader` buffers data to a `Blob`.
 3. `MimeDetector` identifies the format using magic bytes first, then loaded MIME/header data.
    4. `Router` selects the appropriate internal renderer.

## Directory Structure

- `packages/file-viewer/`: The main library package.
    - `src/renderers/`: Internal renderer implementations (PDF, DOCX, Image, TiffRenderer, etc.).
    - `src/image/`: Image helpers (zoom, TIFF decode, `isTiff`).
    - `src/vendor/`: Vendored decode libs (e.g. UTIF.js for TIFF).
    - `src/source/`: Logic for loading and classifying sources.
    - `src/primitives/`: Design system components (generated/copied via Mithya UI CLI).
- `apps/playground/`: Demo application for testing the viewer (referred to as `apps/demo` in some docs).
- `docs/`: Critical documentation.
    - `architecture.md`: High-level data flow and design.
    - `invariants.md`: **Hard constraints** (Read this before any implementation!).
    - `decisions.md`: Rationales for architectural choices.
- `sample-renderers/`: **Reference only**. Do not import from or copy wholesale into `src`.
- `sample-files/`: Test fixtures for various supported formats.

## Development Conventions & Invariants

**Extracted from `docs/invariants.md` - MUST ADHERE TO THESE:**

1. **Public API:** Only expose `FileViewer` and documented public types from the package entry. Renderer components must remain internal; renderer prop types may be exported for TypeScript consumers.
2. **Source Prop:** Accept exactly one `source` prop: `string | Blob | ReadableStream<Uint8Array>`.
3. **Renderer Selection:** MUST be content-driven (magic bytes first, loaded MIME/header data second). NEVER use filename extensions, consumer-provided MIME types, or text/csv content heuristics for routing.
4. **Data Handling:** All sources must be buffered to a `Blob` before rendering (no progressive rendering in v1).
5. **Workers:** Use package-owned bundler-managed module workers (e.g., for PDF/Spreadsheet). Avoid hardcoded paths.
6. **Mithya UI:** Treat `@mithya/ui-registry` as a dev-time tool. Copy/generate primitives into `src/primitives`. Do not import runtime components from the registry.
7. **Styling:** Use Tailwind CSS. Variables must stay in CSS variables, generated from `variables.json`. Do not write `.css` files directly.
8. **SSR Safety:** Ensure all imports and top-level logic are SSR-safe.

## Building and Running

*Note: Project is in early setup. Commands are inferred.*

- **Install Dependencies:**
  ```bash
  pnpm install
  ```
- **Run Playground/Demo:**
  ```bash
  # From root (if monorepo scripts exist) or within apps/playground
  pnpm dev
  ```
- **Build Package:**
  ```bash
  # Within packages/file-viewer
  pnpm build
  ```
- **Test:**
  ```bash
  pnpm test
  ```

## Supported image formats (v1)

- Browser-native: JPEG, PNG, GIF, WebP via `ImageRenderer` (single `<img>`, zoom/pan).
- Classical TIFF (`image/tiff`): magic-byte sniff + `TiffRenderer` — multi-page vertical scroll, lazy UTIF decode per page, `ImageChromeApi` page nav when `pageCount > 1`. Download uses original TIFF bytes.
- PPTX/POTX: magic-byte / MIME sniff + `PptxRenderer` on pinned Pagus (`@pagus-kit/core@0.1.1`, `@pagus-kit/renderer@0.1.1`) — lazy per-slide SVG, `PptxChromeApi` page nav + zoom. Static preview only.
- Not in v1 scope: BigTIFF, multi‑GB single-plane TIFF.
- Custom renderer registration is future work.
- Progressive rendering is future work.
- BigTIFF / exotic TIFF compression gaps as needed.

## Code patterns

- Prefer composition over inheritance
- Ensure single responsibility principle when writing components. 
- In a given file, there should only be one react component
- Ensure the name of the file and the component match. Always rename the file when the component is renamed.
- Avoid using useEffect
- Never write entire functions and call them inside useEffect.