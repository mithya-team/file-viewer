## 1. Scroll stack guard + intent

- [x] 1.1 Hold programmatic IO guard during geometry-null retries until settle
- [x] 1.2 Accept `navIntent` (or equiv) so same-page re-jumps re-run scroll
- [x] 1.3 Update `usePaginatedScrollStack` unit tests for guard + intent

## 2. FileViewer pending page + seed 0

- [x] 2.1 Seed pdf/pptx/image pageCount at 0; reset on source change
- [x] 2.2 Queue pending `setPage` when count is 0; apply when count arrives
- [x] 2.3 Bump nav intent on every `setPage`; pass intent into renderers
- [x] 2.4 Expose `geometryReady` on pdf/pptx/image chrome; wire from renderers

## 3. Renderers

- [x] 3.1 PdfRenderer: report geometryReady when pageSizes complete; accept navIntent
- [x] 3.2 PptxRenderer: report geometryReady; accept navIntent
- [x] 3.3 TiffRenderer: report geometryReady; accept navIntent

## 4. Docs + verification

- [x] 4.1 README: pageCount seed 0, pending setPage, geometryReady, same-page setPage
- [x] 4.2 Tests for early setPage / geometry guard / same-page intent (FileViewer and/or stack)
- [x] 4.3 Run package tests / typecheck
