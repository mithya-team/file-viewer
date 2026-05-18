## Why

Recent `PdfRenderer` and `FileViewer` changes add load-once-per-blob rendering, small-blob rejection, real error propagation, stable `onError` refs, and HiDPI canvas scaling—but none of this is covered by dedicated tests. `FileViewer.test.tsx` mocks `PdfRenderer` entirely, so regressions in PDF load/render/error behavior would go unnoticed.

## What Changes

- Add focused unit tests for `PdfRenderer` (mocking `pdfjs-dist`, not the component itself).
- Extend `FileViewer` integration tests for PDF render-error surfacing and recovery (page/zoom retry) without removing the existing chrome/navigation mocks where appropriate.
- Cover: 128-byte minimum rejection, invalid header rejection, single `getDocument` per blob identity, re-render on page/zoom without reload, `Error` message forwarding, `onError` ref stability under parent re-renders, HiDPI canvas dimensions/transform.
- No public API or runtime behavior changes—tests only.

## Capabilities

### New Capabilities

- `pdf-renderer`: Test requirements for PDF load-once behavior, validation guards, error propagation, callback stability, and HiDPI rendering in `PdfRenderer` / `FileViewer`.

### Modified Capabilities

None.

## Impact

- `packages/file-viewer/test/` (new `PdfRenderer.test.tsx`, updates to `FileViewer.test.tsx`)
- Test mocks for `pdfjs-dist` / worker import
- No changes to `src/` production code unless tests reveal bugs worth fixing separately
