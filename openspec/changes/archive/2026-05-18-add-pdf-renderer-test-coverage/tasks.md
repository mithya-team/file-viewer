## 1. Test infrastructure

- [x] 1.1 Add `packages/file-viewer/test/PdfRenderer.test.tsx` with hoisted mocks for `pdfjs-dist` (`getDocument`, `GlobalWorkerOptions`) and `pdf.worker` import
- [x] 1.2 Implement reusable fake `PDFDocumentProxy` / page stubs (`getPage`, `destroy`, `numPages`, `getViewport`, `render`) and canvas `getContext` / `setTransform` spies

## 2. PdfRenderer unit tests

- [x] 2.1 Test blobs under 128 bytes call `onError` with `PDF data is too small or incomplete.` and never call `getDocument`
- [x] 2.2 Test blobs ≥128 bytes with invalid header call `onError` with `Invalid PDF data.` and never call `getDocument`
- [x] 2.3 Test successful load calls `getDocument` once and `onPageCountChange` with `numPages`
- [x] 2.4 Test `page` prop change calls `getPage` again without a second `getDocument`
- [x] 2.5 Test `zoom` prop change re-renders without a second `getDocument`
- [x] 2.6 Test `blob` prop change destroys prior doc and calls `getDocument` again
- [x] 2.7 Test `getDocument` rejection forwards the original `Error` message via `onError`
- [x] 2.8 Test parent re-renders with new `onError` identity do not call `getDocument` more than once per blob
- [x] 2.9 Test HiDPI: with `devicePixelRatio` 2, assert canvas backing store, CSS size, and `setTransform(2, …)`

## 3. FileViewer integration tests

- [x] 3.1 Add test: PDF render error shows `failureState.error.message` in fallback UI
- [x] 3.2 Add test: consumer `onError` receives render-stage error with the same message
- [x] 3.3 Add test: changing PDF page or zoom clears `renderError` and shows renderer again (use error-injecting `PdfRenderer` mock or scoped unmock)

## 4. Verification

- [x] 4.1 Run `pnpm test` in `packages/file-viewer` and ensure all new tests pass
- [x] 4.2 Confirm existing `FileViewer` tests still pass without broad PdfRenderer unmocking
