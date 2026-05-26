## Why

Image files render at a fixed fit-to-viewport size with no zoom controls. Consumers need the same zoom affordances as PDFs—toolbar controls, custom chrome, and mouse-only interaction when chrome is hidden—so image viewing matches product expectations in hosts that embed `FileViewer`.

## What Changes

- Add `imageZoom` state in `FileViewer`, reset on `source` change (same lifecycle as `pdfZoom`).
- Extend `ImageChromeApi` with an `image` namespace parallel to `api.pdf` (`zoom`, `zoomIn`, `zoomOut`, `setZoom`, `stepZoomIn`, `resetZoom`).
- Default chrome shows zoom − / % / + for image files (max 200%, min 40% via toolbar).
- Upgrade `ImageRenderer` to apply zoom via layout (`width` % of container), scroll overflow, and pointer pan when zoomed.
- Single-click on the image steps zoom sequentially (+50 → +25 → +10 → +10… capped at 200%); at 200% further clicks are no-ops.
- Double-click resets zoom to 100%.
- Mouse zoom works when `chrome="none"`; chrome only controls optional toolbar UI.
- Pure helpers for step zoom and clamping; unit tests for step sequence and bounds.

## Capabilities

### New Capabilities

- `image-renderer`: Image zoom rendering, pointer gestures (step in, reset, pan), shell-owned zoom state, `ImageChromeApi`, and default chrome zoom controls.

### Modified Capabilities

- `public-type-exports`: `ImageChromeApi` and `ImageRendererProps` gain documented zoom-related fields (additive type surface).

## Impact

- `packages/file-viewer/src/FileViewer.tsx` — `imageZoom` state, `createChromeApi` image branch, pass props to `ImageRenderer`
- `packages/file-viewer/src/types.ts` — `ImageChromeApi`, `ImageRendererProps`
- `packages/file-viewer/src/renderers/ImageRenderer.tsx` — scroll layout, pan, click handlers
- `packages/file-viewer/src/FileViewerDefaultChrome.tsx` — image zoom toolbar
- `packages/file-viewer/src/index.ts` — export new helpers/types if any are public
- `apps/demo/src/DemoViewerChrome.tsx` — optional demo parity
- `packages/file-viewer/test/` — unit tests for zoom helpers; `FileViewer` / `ImageRenderer` integration tests
- `packages/file-viewer/README.md` — document image chrome API and mouse zoom
