# PDF Renderer Specification

## Purpose

`PdfRenderer` and `FileViewer` PDF integration SHALL define load, render, error, and HiDPI behavior covered by automated tests.

## Requirements

### Requirement: Reject undersized PDF blobs before parse

`PdfRenderer` SHALL reject blobs smaller than 128 bytes without calling `pdfjs-dist` `getDocument`, and SHALL report `PDF data is too small or incomplete.` via `onError`.

#### Scenario: Blob below minimum size

- **WHEN** `PdfRenderer` receives a blob with `size` less than 128
- **THEN** `onError` SHALL be called with an `Error` whose message is `PDF data is too small or incomplete.`
- **THEN** `getDocument` SHALL NOT be invoked

### Requirement: Reject invalid PDF header before parse

`PdfRenderer` SHALL reject blobs that do not begin with the `%PDF` magic bytes without calling `getDocument`, and SHALL report `Invalid PDF data.` via `onError`.

#### Scenario: Blob large enough but wrong header

- **WHEN** `PdfRenderer` receives a blob with `size` at least 128 whose first bytes are not `%PDF`
- **THEN** `onError` SHALL be called with an `Error` whose message is `Invalid PDF data.`
- **THEN** `getDocument` SHALL NOT be invoked

### Requirement: Load PDF document once per blob identity

`PdfRenderer` SHALL call `getDocument` at most once per stable `blob` reference while that blob remains mounted, and SHALL keep the loaded document available for subsequent page and zoom changes without reloading.

#### Scenario: Page change does not reload document

- **WHEN** a PDF document has loaded successfully for a blob
- **AND** the `page` prop changes
- **THEN** `getDocument` SHALL NOT be invoked again
- **THEN** `getPage` SHALL be invoked for the new page

#### Scenario: Zoom change does not reload document

- **WHEN** a PDF document has loaded successfully for a blob
- **AND** the `zoom` prop changes
- **THEN** `getDocument` SHALL NOT be invoked again
- **THEN** a new render SHALL occur for the current page at the new scale

#### Scenario: Blob change reloads document

- **WHEN** the `blob` prop changes to a different blob instance
- **THEN** the previous document SHALL be destroyed
- **THEN** `getDocument` SHALL be invoked for the new blob

### Requirement: Forward real Error instances to onError

`PdfRenderer` and `FileViewer` SHALL propagate `Error` instances to consumers without replacing known messages with a generic fallback.

#### Scenario: PdfRenderer preserves Error message from load failure

- **WHEN** `getDocument` rejects with an `Error` whose message is `Corrupt PDF.`
- **THEN** `onError` SHALL receive an `Error` with message `Corrupt PDF.`

#### Scenario: FileViewer displays render error message

- **WHEN** the PDF renderer reports a render-stage error with message `Corrupt PDF.`
- **THEN** the viewer fallback UI SHALL display `Corrupt PDF.`
- **THEN** the consumer `onError` callback SHALL receive the same message at stage `render`

### Requirement: Stable onError across parent re-renders

`PdfRenderer` SHALL NOT abort or restart PDF loading solely because the parent passes a new `onError` function identity on re-render.

#### Scenario: Parent re-render does not re-invoke getDocument

- **WHEN** `PdfRenderer` is mounted with a blob and the parent re-renders multiple times with a new `onError` reference each time
- **THEN** `getDocument` SHALL be called exactly once for that blob

### Requirement: HiDPI canvas scaling for PDF pages

`PdfRenderer` SHALL scale the canvas backing store by `window.devicePixelRatio` while keeping CSS layout dimensions at the viewport size, and SHALL apply a matching `setTransform` before rendering.

#### Scenario: Retina display doubles backing store

- **WHEN** `window.devicePixelRatio` is 2
- **AND** a page is rendered at a known viewport size
- **THEN** `canvas.width` and `canvas.height` SHALL equal the viewport dimensions multiplied by 2 (floored)
- **THEN** `canvas.style.width` and `canvas.style.height` SHALL match the viewport dimensions in CSS pixels
- **THEN** the 2D context `setTransform` SHALL be called with scale 2 on the x and y axes

### Requirement: FileViewer clears render errors on PDF navigation retry

`FileViewer` SHALL clear a prior PDF render error when the user changes page or zoom so the renderer can retry.

#### Scenario: Page change clears render error

- **WHEN** a PDF render error is active
- **AND** the PDF page changes
- **THEN** the render error state SHALL be cleared
- **THEN** the PDF renderer SHALL be shown again instead of the error fallback

### Requirement: Show loading UI while PDF document is unavailable

`PdfRenderer` SHALL display a loading status while the PDF document for the current blob has not yet loaded, independent of the `pageCount` prop from the parent.

#### Scenario: Loading UI before document resolves

- **WHEN** `PdfRenderer` is mounted with a valid blob
- **AND** `getDocument` has not yet resolved for that blob
- **THEN** the viewer SHALL display `Loading PDF...`
- **THEN** the page indicator SHALL NOT be shown

#### Scenario: Loading UI hidden after document loads

- **WHEN** `getDocument` resolves successfully
- **THEN** the loading status SHALL no longer be displayed
- **THEN** the page indicator SHALL be shown

#### Scenario: Loading UI reappears on blob change

- **WHEN** the `blob` prop changes to a new blob
- **THEN** the loading status SHALL be displayed again until the new document loads
