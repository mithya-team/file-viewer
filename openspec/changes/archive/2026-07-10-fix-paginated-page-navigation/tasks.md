## 1. Shared scroll stack

- [x] 1.1 Extend `usePaginatedScrollStack` with geometry-based smooth `scrollTo`, ε no-op, `scrollend`+timeout guard; remove echo-flag requirement from callers
- [x] 1.2 Add shared page-offset helper for PDF/TIFF size maps (gap-aware cumulative top)

## 2. Renderers

- [x] 2.1 Refactor `PdfRenderer` onto shared stack; drop `pageFromScrollRef`; wire settle callback
- [x] 2.2 Refactor `TiffRenderer` same as PDF
- [x] 2.3 Update `PptxRenderer` to smooth `scrollTo` + settle callback (keep geometry source)

## 3. Chrome API

- [x] 3.1 Add `PageNavigateEvent` + `subscribePageNavigate` to types; export from entry
- [x] 3.2 Wire listener sets in `FileViewer` / chrome factory; pass settle from renderers
- [x] 3.3 Update `verify-dist` / README note for subscribe + stable chrome identity

## 4. Tests

- [x] 4.1 Unit: ε / shouldReport / offset helper
- [x] 4.2 Pdf/Tiff: setPage after simulated scroll still scrolls; settle fires; unsubscribe works
- [x] 4.3 Pptx: smooth scroll + settle
- [x] 4.4 FileViewer chrome API subscribe typing/smoke
