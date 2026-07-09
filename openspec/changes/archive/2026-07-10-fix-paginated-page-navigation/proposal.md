## Why

Citation hosts (e.g. Ren3 web-console) call `api.pdf.setPage(n)` and often get chrome page updates without scroll, because PDF/TIFF use a `pageFromScrollRef` echo guard that skips programmatic navigation after user scroll. Hosts also lack a settle signal, so they poll DOM for slot layout. PPTX already uses a cleaner scroll stack; PDF/TIFF should align, keep smooth scrolling, and expose a programmatic navigate-settled listener.

## What Changes

- Remove `pageFromScrollRef` from PDF/TIFF; adopt shared `usePaginatedScrollStack` + geometry-based smooth `scrollTo` (same for PPTX).
- Programmatic `setPage` always scrolls when target offset differs (ε-check replaces echo flag).
- Gate smooth scroll on known page/slot geometry; suppress IO→page during nav (`scrollend` + timeout fallback).
- Add `subscribePageNavigate` on paginated chrome APIs (`pdf` / `image` / `pptx`) — programmatic settle only.
- Update `paginated-scroll-stack` requirements to match (drop pageFromScrollRef; smooth geometry scroll).
- Document listener + stable custom-chrome identity note in README/HELP as needed.

Out of scope this change: shared `api.navigateToPage`, canvas `max-w-none` theme hardening, chrome render-prop API.

## Capabilities

### New Capabilities

- `page-navigate-settled`: Chrome API subscribe for programmatic page-nav settle across PDF / multi-page TIFF / PPTX.

### Modified Capabilities

- `paginated-scroll-stack`: Drop scroll-echo flag; geometry + smooth scroll; IO guard via programmatic/scrollend.
- `pdf-renderer`: Align PdfRenderer with shared stack + settle wiring.
- `image-renderer`: Align TiffRenderer the same way; expose subscribe on `image` when paginated.
- `pptx-renderer`: Smooth scroll + settle wiring (keep geometry scrollTop source).
- `public-type-exports`: Export settle event type + `subscribePageNavigate` on chrome APIs.

## Impact

- `packages/file-viewer/src/renderers/{Pdf,Tiff,Pptx}Renderer.tsx`, `usePaginatedScrollStack.ts`
- `packages/file-viewer/src/types.ts`, `FileViewer.tsx`, chrome API factory
- Tests for scroll-on-setPage, settle listener, no false skip after user scroll
- README / type export verify script
