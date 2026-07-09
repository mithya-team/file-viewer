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

`PdfRenderer` SHALL call `getDocument` at most once per stable `blob` reference while that blob remains mounted, and SHALL keep the loaded document available for page navigation, scroll, and zoom changes without reloading.

#### Scenario: Page change does not reload document

- **WHEN** a PDF document has loaded successfully for a blob
- **AND** the `page` prop changes (including scroll-driven updates from the parent)
- **THEN** `getDocument` SHALL NOT be invoked again
- **THEN** the renderer SHALL scroll to the requested page without reloading the document

#### Scenario: Zoom change does not reload document

- **WHEN** a PDF document has loaded successfully for a blob
- **AND** the `zoom` prop changes
- **THEN** `getDocument` SHALL NOT be invoked again
- **THEN** visible and near-visible pages SHALL be re-rendered at the new scale

#### Scenario: Blob change reloads document

- **WHEN** the `blob` prop changes to a different blob instance
- **THEN** the previous document SHALL be destroyed
- **THEN** `getDocument` SHALL be invoked for the new blob
- **THEN** precomputed unscaled page sizes SHALL be refreshed for the new document

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

`PdfRenderer` SHALL scale each page canvas backing store by `window.devicePixelRatio` while keeping CSS layout dimensions at the viewport size for that page at the current zoom, and SHALL apply a matching `setTransform` before rendering.

#### Scenario: Retina display doubles backing store

- **WHEN** `window.devicePixelRatio` is 2
- **AND** a page is rendered at a known viewport size
- **THEN** that page's `canvas.width` and `canvas.height` SHALL equal the viewport dimensions multiplied by 2 (floored)
- **THEN** that page's `canvas.style.width` and `canvas.style.height` SHALL match the viewport dimensions in CSS pixels
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
- **THEN** the page stack SHALL NOT be shown

#### Scenario: Loading UI hidden after document loads

- **WHEN** `getDocument` resolves successfully
- **THEN** the loading status SHALL no longer be displayed
- **THEN** the scrollable page stack SHALL be shown

#### Scenario: Loading UI reappears on blob change

- **WHEN** the `blob` prop changes to a new blob
- **THEN** the loading status SHALL be displayed again until the new document loads

### Requirement: Continuous vertical scroll layout for all pages

`PdfRenderer` SHALL render all PDF pages in a single vertically scrollable column, in document order, with a consistent gap between adjacent page slots.

#### Scenario: Multi-page document shows stacked page slots

- **WHEN** a PDF document with `numPages` greater than 1 has loaded
- **THEN** the scroll container SHALL contain one page slot per page from 1 through `numPages`
- **THEN** each page slot SHALL be separated by a visible gap from the next slot

#### Scenario: Single-page document uses same layout

- **WHEN** a PDF document with `numPages` equal to 1 has loaded
- **THEN** the scroll container SHALL contain exactly one page slot

### Requirement: Scroll container and page sheet styling

`PdfRenderer` SHALL use a full-height transparent scroll root and opaque per-page surfaces so page bitmaps read as sheets over the viewer background, consistent with `sample-renderers/PdfRenderer.tsx`.

#### Scenario: Scroll root fills content area

- **WHEN** the PDF has loaded
- **THEN** the scroll root SHALL allow vertical overflow scrolling
- **THEN** the scroll root background SHALL be transparent (host/chrome background shows through)

#### Scenario: Page slot appearance

- **WHEN** a page slot is rendered in the stack
- **THEN** the slot SHALL use the package surface token for its background
- **THEN** the slot SHALL be horizontally centered with a shadow suitable for a page sheet
- **THEN** the canvas SHALL be positioned under the text layer with pointer events disabled on the canvas

### Requirement: Lazy-render pages near the viewport

`PdfRenderer` SHALL render page canvas and text layer content only for pages whose slots intersect the scroll viewport, extended by a root margin of approximately 600px, using `IntersectionObserver`.

#### Scenario: Off-screen page is not painted initially

- **WHEN** a multi-page PDF has loaded
- **AND** only page 1 is intersecting the viewport (with margin)
- **THEN** `getPage` SHALL NOT be invoked for pages that are not intersecting

#### Scenario: Scrolling into view triggers render

- **WHEN** the user scrolls so that page 2's slot intersects the viewport (with margin)
- **THEN** `getPage` SHALL be invoked for page 2
- **THEN** the page canvas SHALL receive a render at the current zoom scale

### Requirement: Scroll position drives current page

`PdfRenderer` SHALL report the page number with the highest intersection ratio in the viewport to the parent via `onVisiblePageChange` when the user scrolls, except during programmatic scroll-to-page (guard until `scrollend` or `PROGRAMMATIC_SCROLL_GUARD_MS`). Programmatic `page` changes SHALL smooth-scroll using known page geometry and SHALL NOT skip scroll solely because a prior visible-page report came from user scroll.

#### Scenario: Scrolling updates visible page

- **WHEN** the user scrolls so that page 3 has the highest intersection ratio in the viewport
- **THEN** `onVisiblePageChange` SHALL be called with `3`

#### Scenario: Programmatic jump does not fight parent page state

- **WHEN** the `page` prop changes to 5
- **AND** the renderer smooth-scrolls to page 5
- **THEN** spurious `onVisiblePageChange` callbacks during the programmatic scroll guard window SHALL be suppressed

#### Scenario: setPage after user scroll still scrolls

- **WHEN** the user has scrolled so chrome shows page 6
- **AND** the parent sets `page` to 15 with known geometry
- **THEN** the scroll root SHALL smooth-scroll toward page 15

### Requirement: Toolbar page input jumps scroll position

`FileViewer` default chrome SHALL provide prev/next, zoom controls, and a page number input for PDFs. `setPage` SHALL update `pdf.page` and `PdfRenderer` SHALL smooth-scroll the matching page into view using page geometry. `pdf.subscribePageNavigate` SHALL notify listeners when that programmatic navigation settles.

#### Scenario: User enters page number in chrome

- **WHEN** the user commits page `4` in the default PDF chrome page input
- **AND** the document has at least 4 pages
- **THEN** `pdf.page` in chrome API SHALL become `4`
- **THEN** the PDF scroll container SHALL smooth-scroll so page 4 is at the start of the viewport

#### Scenario: Prev and next adjust page and scroll

- **WHEN** the user clicks next page in default chrome
- **AND** the current page is less than `pageCount`
- **THEN** `pdf.page` SHALL increment by 1
- **THEN** the renderer SHALL smooth-scroll the new page into view

### Requirement: Text layer line-level by default

For each rendered page, `PdfRenderer` SHALL render a pdf.js `TextLayer` aligned to the page viewport. When `searchQuery` is empty or whitespace-only, text layer runs SHALL remain pdf.js line/run `div` elements without word-level child spans.

#### Scenario: No search uses line-level runs only

- **WHEN** `searchQuery` is empty
- **AND** a page text layer has finished rendering
- **THEN** text layer `div` elements SHALL NOT contain word-segment child spans
- **THEN** text selection SHALL operate on pdf.js text run divs

#### Scenario: Text layer mounts after canvas render

- **WHEN** a page is rendered to canvas at the current zoom
- **THEN** a text layer container for that page SHALL be present with `pointer-events` enabled for selection
- **THEN** the text layer SHALL be built from `getTextContent` for that page

### Requirement: Word-level spans only during active search

When `searchQuery` trimmed is non-empty, `PdfRenderer` SHALL wrap text layer runs with word-level spans carrying local offset metadata, and SHALL rebuild visible text layers without word spans when search is cleared.

#### Scenario: Non-empty search adds word spans

- **WHEN** `searchQuery` becomes non-empty
- **AND** a visible page's text layer is rendered
- **THEN** that page's text layer SHALL include word span elements with local start/end metadata

#### Scenario: Clearing search removes word spans

- **WHEN** `searchQuery` becomes empty after a prior search
- **THEN** word span elements SHALL be removed from text layers on affected pages
- **THEN** search highlight styles SHALL be cleared

### Requirement: Search highlight styling on text layer

When search matches and an active match index are provided, `PdfRenderer` SHALL apply distinct highlight styles to matching word spans when present, or to whole text run divs as a line-level fallback.

#### Scenario: Highlights on word spans when search active

- **WHEN** search matches include a range on page 2
- **AND** page 2 has word spans in its text layer
- **THEN** matching word spans SHALL receive search hit styling
- **THEN** the active match SHALL receive distinct active styling

#### Scenario: Line-level fallback when word spans absent

- **WHEN** search matches exist on a page
- **AND** that page's text layer has no word span children yet
- **THEN** matching text run divs MAY receive hit styling at div granularity

### Requirement: Zoom applies to all pages in the scroll stack

`PdfRenderer` SHALL use the `zoom` prop as percent scale (`zoom / 100`) for every page render. When `zoom` changes, visible and near-visible pages SHALL be re-rendered at the new scale without reloading the document; an explicit visible-page repaint SHALL run after zoom settles.

#### Scenario: Zoom change re-renders visible page

- **WHEN** page 1 is visible and rendered at zoom 100
- **AND** `zoom` changes to 150
- **THEN** page 1 SHALL be re-rendered with viewport scale 1.5
- **THEN** `getDocument` SHALL NOT be invoked again for the same blob

#### Scenario: Zoom change does not eagerly render all pages

- **WHEN** a 10-page PDF has only page 1 visible
- **AND** `zoom` changes
- **THEN** `getPage` SHALL NOT be invoked for pages 2–10 unless they are near or in the viewport

