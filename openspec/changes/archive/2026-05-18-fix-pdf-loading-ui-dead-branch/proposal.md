## Why

`PdfRenderer` renders `Loading PDF...` only when `pageCount === 0`, but `FileViewer` always passes `pdfPageCount` starting at `1` and resets to `1` on source change. The loading branch never runs; users see an empty canvas and `Page 1 / 1` while the document loads.

## What Changes

- Drive PDF loading UI from document load state inside `PdfRenderer` (not parent `pageCount === 0`).
- Hide or defer the page indicator until the document is loaded (optional polish).
- Add tests asserting loading UI appears before `onPageCountChange` fires.
- No public API changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pdf-renderer`: Add requirement for visible loading state while the PDF document is not yet available.

## Impact

- `packages/file-viewer/src/renderers/PdfRenderer.tsx`
- `packages/file-viewer/test/PdfRenderer.test.tsx` (and possibly `FileViewer.test.tsx` if integration coverage is added)
