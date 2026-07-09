## Why

PPTX is a common attachment format but the viewer currently routes `.pptx` / OpenXML presentation zips to unsupported. A spike on `sample-files/*.pptx` validated **[Pagus](https://github.com/pagus-kit/Pagus)** (`@pagus-kit/core@0.1.1`, `@pagus-kit/renderer@0.1.1`) for font fidelity, zoom/scaling, and render performance versus alternatives. Post-v1 scope now includes static slide preview without changing the public `FileViewer` props API.

## What Changes

- Add content-driven **`pptx` detection** (magic-byte `ppt/` sniff in PK zip samples + `presentationml.presentation` / `presentationml.template` MIME); **POTX** routes through the same path as PPTX (mirror dotx→docx).
- Pin **`@pagus-kit/core@0.1.1`** and **`@pagus-kit/renderer@0.1.1`**; do **not** use `@pagus-kit/react`.
- Add internal **`PptxRenderer`**: parse once per buffered `Blob`, lazy per-slide `renderSlide` → SVG in a vertical scroll stack with package-owned chrome (page nav + zoom).
- Extract shared **`usePaginatedScrollStack`** hook (first consumer: Pptx; Pdf/Tiff migration deferred).
- Add **`PptxChromeApi`** to the discriminated `FileViewerChromeApi` union; default chrome shows page/zoom controls like PDF.
- **Static preview only** — no animations, editing, or presenter mode.
- Update demo fixtures, docs, and invariants to reflect PPTX support.
- **Out of scope:** PPT (OLE), embedded media playback, animation steps, custom renderer registration.

## Capabilities

### New Capabilities

- `pptx-renderer`: PPTX/POTX detection, Pagus parse/render pipeline, lazy slide SVG mount, scroll/page sync, zoom via slot dimensions, download of original blob.
- `paginated-scroll-stack`: Shared `usePaginatedScrollStack` hook for lazy viewport prefetch, visible-page reporting, and programmatic scroll guard (constants from PDF renderer).

### Modified Capabilities

- `public-type-exports`: Add `PptxChromeApi`, `PptxRendererProps`, and `pptx` in `FileKind` / `DetectionResult` to the documented export surface.

## Impact

- `packages/file-viewer/package.json` — Pagus dependencies (pinned 0.1.1)
- `packages/file-viewer/src/detect/detectFileKind.ts` — `pptx` OpenXML sniff + MIME
- `packages/file-viewer/src/types.ts`, `src/index.ts` — `pptx` kind, `PptxChromeApi`
- `packages/file-viewer/src/renderers/PptxRenderer.tsx` — new renderer
- `packages/file-viewer/src/renderers/usePaginatedScrollStack.ts` — new shared hook
- `packages/file-viewer/src/FileViewer.tsx`, `FileViewerDefaultChrome.tsx` — routing + chrome
- `packages/file-viewer/test/detectFileKind.test.ts` — pptx cases (flip existing negative test)
- `packages/file-viewer/scripts/verify-dist.mjs` — new public types
- `apps/demo` — pptx fixtures and chrome demo branch
- `docs/invariants.md`, `docs/architecture.md`, `AGENTS.md`, `future_work.md`, package `README.md`
