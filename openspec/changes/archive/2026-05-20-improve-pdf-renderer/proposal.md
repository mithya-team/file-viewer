## Why

`PdfRenderer` today paints a single page on one canvas. That limits reading flow (no continuous scroll), wastes work on off-screen pages, blocks native text selection and search highlights, and decouples toolbar page state from what the user is actually viewing. A multi-page scroll stack with lazy rendering and pdf.js text layers matches expected PDF viewer UX and unlocks shell-level search later.

## What Changes

- **Layout:** Continuous vertical scroll — all pages stacked in document order with consistent gaps between page slots.
- **Navigation:** Scroll drives current page; toolbar page input jumps to a page; scroll position and `page` prop stay in sync (bidirectional where appropriate).
- **Rendering:** Lazy-render pages entering the viewport via `IntersectionObserver` (with root margin); retain or re-render when zoom changes.
- **Text layer:** pdf.js `TextLayer` per rendered page; **line-level runs by default**, **word spans only when search is non-empty**; highlight hooks for search hits (shell supplies query/match index later).
- **UX reference:** `design.md` maps `sample-renderers/PdfRenderer.tsx` (scroll, toolbar, zoom, backgrounds, observers, search) for implementers.
- **Zoom:** Single `zoom` scale applied to every page in the stack (canvas + text layer), not one page at a time.
- **Chrome:** Default PDF toolbar gains editable page input; prev/next and page label reflect scroll-derived page when scrolling.
- **Tests:** Extend `PdfRenderer` / `FileViewer` tests for scroll layout, visibility-driven page updates, lazy render, text layer presence, and zoom-all-pages behavior.

Existing load-once-per-blob, validation guards, HiDPI scaling, and error propagation remain; requirements that assume a single canvas for one page are updated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pdf-renderer`: Multi-page scroll layout, sheet styling, scroll/toolbar sync, lazy render, line-level text layer default, word spans + highlights when searching, global zoom.

## Impact

- `packages/file-viewer/src/renderers/PdfRenderer.tsx` (major refactor)
- `packages/file-viewer/src/FileViewer.tsx` (PDF page state: scroll → page, `setPage` → scroll)
- `packages/file-viewer/src/FileViewerDefaultChrome.tsx` (page number input)
- `packages/file-viewer/src/types.ts` (optional PDF chrome callbacks if needed for scroll sync)
- Tailwind-only styling for text layer (no new `.css` files per invariants; mirror patterns from `sample-renderers` via utility classes / CSS variables)
- `packages/file-viewer/test/PdfRenderer.test.tsx`, `FileViewer.test.tsx`
- `openspec/specs/pdf-renderer/spec.md` (via delta in this change)
