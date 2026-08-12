## Why

PDF page chrome can report a newly requested page without moving the document, and subsequent pointer or wheel scrolling can flicker between offsets. This regressed when the PDF renderer moved to EmbedPDF and leaves external citation navigation unreliable.

## What Changes

- Make PDF page navigation wait for EmbedPDF's rendered scroll layout and replay the latest queued request when that layout is ready.
- Prevent unchanged zoom values from issuing repeated EmbedPDF zoom and scroll commands on page-state re-renders.
- Keep programmatic navigation isolated from user-driven visible-page reporting, while preserving same-page re-jumps and settled-navigation notifications.
- Add regression coverage for pre-layout, repeated, and user-scroll navigation behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pdf-renderer`: PDF navigation and zoom synchronization must remain stable across the renderer lifecycle and EmbedPDF layout readiness.
- `page-navigate-settled`: Queued PDF commands must settle only after the latest requested page has actually navigated.

## Impact

- `packages/file-viewer/src/renderers/PdfRenderer.tsx`: navigation readiness, event filtering, and zoom synchronization.
- `packages/file-viewer/test/PdfRenderer.test.tsx`: EmbedPDF adapter navigation regression coverage.
- No public API or dependency changes.
