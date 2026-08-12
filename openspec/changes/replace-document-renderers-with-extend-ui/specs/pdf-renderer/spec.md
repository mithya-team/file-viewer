## ADDED Requirements

### Requirement: PDF adapter uses the Extend PDF rendering stack

`PdfRenderer` SHALL remain internal and SHALL render normalized PDF blobs through the pinned EmbedPDF stack selected by Extend UI. It SHALL disable vendor toolbar, upload, download, and thumbnail UI so FileViewer remains the package control surface.

#### Scenario: PDF renders without vendor chrome

- **WHEN** FileViewer mounts `PdfRenderer` for a ready PDF blob
- **THEN** the EmbedPDF surface SHALL render without its own toolbar, upload control, download control, or thumbnail rail
- **THEN** FileViewer's PDF chrome API SHALL remain available to built-in and custom chrome

### Requirement: PDF search behavior remains available through renderer props

`PdfRenderer` SHALL honor its `searchQuery`, `activeMatchIndex`, `onSearchStateChange`, and `onRequestPageForSearch` props through the EmbedPDF search capability. The renderer SHALL preserve query result counts and active-result page navigation behavior without depending on pdf.js text-layer DOM markup.

#### Scenario: Search result on another page requests navigation

- **WHEN** `searchQuery` identifies an active PDF result on page 4 while FileViewer reports page 1
- **THEN** `onSearchStateChange` SHALL report the search result state
- **THEN** `onRequestPageForSearch` SHALL be called with `4`

#### Scenario: Clearing search clears result state

- **WHEN** a non-empty `searchQuery` becomes empty
- **THEN** the renderer SHALL clear engine search results and active highlight state
- **THEN** `onSearchStateChange` SHALL report zero results and a non-searching state

## MODIFIED Requirements

### Requirement: Reject undersized PDF blobs before parse

`PdfRenderer` SHALL reject blobs smaller than 128 bytes before opening them in the EmbedPDF document engine, and SHALL report `PDF data is too small or incomplete.` via `onError`.

#### Scenario: Blob below minimum size

- **WHEN** `PdfRenderer` receives a blob with `size` less than 128
- **THEN** `onError` SHALL be called with an `Error` whose message is `PDF data is too small or incomplete.`
- **THEN** the EmbedPDF document engine SHALL NOT be opened

### Requirement: Reject invalid PDF header before parse

`PdfRenderer` SHALL reject blobs that do not begin with the `%PDF` magic bytes before opening them in the EmbedPDF document engine, and SHALL report `Invalid PDF data.` via `onError`.

#### Scenario: Blob large enough but wrong header

- **WHEN** `PdfRenderer` receives a blob with `size` at least 128 whose first bytes are not `%PDF`
- **THEN** `onError` SHALL be called with an `Error` whose message is `Invalid PDF data.`
- **THEN** the EmbedPDF document engine SHALL NOT be opened

### Requirement: Load PDF document once per blob identity

`PdfRenderer` SHALL open a PDF document at most once per stable `blob` reference while that blob remains mounted, and SHALL keep the loaded engine document available for page navigation, scroll, zoom, and search changes without reloading.

#### Scenario: Page change does not reload document

- **WHEN** a PDF document has loaded successfully for a blob
- **AND** the `page` prop changes, including a scroll-driven update from the parent
- **THEN** the PDF engine SHALL NOT reopen the document
- **THEN** the renderer SHALL scroll to the requested page through the loaded engine control

#### Scenario: Zoom change does not reload document

- **WHEN** a PDF document has loaded successfully for a blob
- **AND** the `zoom` prop changes
- **THEN** the PDF engine SHALL NOT reopen the document
- **THEN** visible pages SHALL update at the new scale

#### Scenario: Blob change reloads document

- **WHEN** the `blob` prop changes to a different blob instance
- **THEN** the previous engine document and its object URL SHALL be disposed
- **THEN** the renderer SHALL open the new blob as a new document
- **THEN** page count and geometry readiness SHALL reset and then reflect the new document

### Requirement: Forward real Error instances to onError

`PdfRenderer` and `FileViewer` SHALL propagate `Error` instances from the EmbedPDF load or render path without replacing known messages with a generic fallback.

#### Scenario: PdfRenderer preserves Error message from load failure

- **WHEN** the PDF engine rejects with an `Error` whose message is `Corrupt PDF.`
- **THEN** `onError` SHALL receive an `Error` with message `Corrupt PDF.`

#### Scenario: FileViewer displays render error message

- **WHEN** the PDF renderer reports a render-stage error with message `Corrupt PDF.`
- **THEN** the viewer fallback UI SHALL display `Corrupt PDF.`
- **THEN** the consumer `onError` callback SHALL receive the same message at stage `render`

### Requirement: Stable onError across parent re-renders

`PdfRenderer` SHALL NOT abort or restart PDF loading solely because the parent passes a new `onError` function identity on re-render.

#### Scenario: Parent re-render does not reopen document

- **WHEN** `PdfRenderer` is mounted with a blob and the parent re-renders multiple times with a new `onError` reference each time
- **THEN** the PDF engine SHALL open that blob exactly once

### Requirement: Show loading UI while PDF document is unavailable

`PdfRenderer` SHALL display a loading status while the PDF document for the current blob is unavailable in the EmbedPDF engine, independent of the `pageCount` prop from the parent.

#### Scenario: Loading UI before document resolves

- **WHEN** `PdfRenderer` is mounted with a valid blob
- **AND** the PDF engine has not finished opening the document
- **THEN** the viewer SHALL display `Loading PDF...`
- **THEN** the interactive page surface SHALL not be presented as ready

#### Scenario: Loading UI hidden after document loads

- **WHEN** the PDF engine finishes opening the document
- **THEN** the loading status SHALL no longer be displayed
- **THEN** the scrollable PDF surface SHALL be shown

#### Scenario: Loading UI reappears on blob change

- **WHEN** the `blob` prop changes to a new blob
- **THEN** the loading status SHALL be displayed again until the new document loads

### Requirement: Lazy-render pages near the viewport

`PdfRenderer` SHALL use EmbedPDF's virtualized rendering capability so page rendering is deferred for pages outside the viewport and nearby prefetch range.

#### Scenario: Off-screen page is not painted initially

- **WHEN** a multi-page PDF has loaded
- **AND** only page 1 is near the viewport
- **THEN** the adapter SHALL not require every later page to be painted before page 1 is usable

#### Scenario: Scrolling into view triggers render

- **WHEN** the user scrolls so page 2 enters the viewport or prefetch range
- **THEN** the engine SHALL make page 2 available for display without reopening the document

### Requirement: Scroll position drives current page

`PdfRenderer` SHALL report the active page in the PDF viewport to the parent via `onVisiblePageChange` when the user scrolls. Programmatic `page` changes SHALL invoke the loaded PDF control to scroll to the requested page and SHALL suppress competing visible-page reports until that command settles.

#### Scenario: Scrolling updates visible page

- **WHEN** the user scrolls so page 3 becomes active
- **THEN** `onVisiblePageChange` SHALL be called with `3`

#### Scenario: Programmatic jump does not fight parent page state

- **WHEN** the `page` prop changes to 5
- **AND** the renderer starts programmatic navigation to page 5
- **THEN** spurious visible-page callbacks during that navigation SHALL be suppressed

#### Scenario: setPage after user scroll still scrolls

- **WHEN** the user has scrolled so chrome shows page 6
- **AND** the parent sets `page` to 15 after geometry is ready
- **THEN** the loaded PDF control SHALL navigate toward page 15

### Requirement: Zoom applies to all pages in the scroll stack

`PdfRenderer` SHALL translate its percent `zoom` prop to the EmbedPDF zoom control for the loaded document. A zoom change SHALL update visible pages without reopening the document and SHALL preserve the scrollable document surface.

#### Scenario: Zoom change updates visible page

- **WHEN** page 1 is visible at zoom 100
- **AND** `zoom` changes to 150
- **THEN** page 1 SHALL update to the requested scale
- **THEN** the PDF engine SHALL not reopen the document for the same blob

#### Scenario: Zoom change does not eagerly render all pages

- **WHEN** a 10-page PDF has only page 1 near the viewport
- **AND** `zoom` changes
- **THEN** the adapter SHALL not require pages 2 through 10 to be painted before the zoom update completes

## REMOVED Requirements

### Requirement: HiDPI canvas scaling for PDF pages

**Reason**: EmbedPDF owns the rendering surface and device-pixel-ratio strategy; FileViewer no longer manipulates a pdf.js canvas context.

**Migration**: Validate high-density display fidelity through browser visual/integration tests rather than canvas backing-store assertions.

### Requirement: Scroll container and page sheet styling

**Reason**: The replacement engine owns page canvas/text-layer structure, so its private DOM layering cannot be the package contract.

**Migration**: Retain token-based viewer theming and validate the rendered continuous document surface without asserting pdf.js canvas/text-layer placement.

### Requirement: Text layer line-level by default

**Reason**: EmbedPDF owns selectable-text DOM and does not expose pdf.js line-run elements as a supported contract.

**Migration**: Use the renderer-agnostic PDF search and text-selection behavior instead of inspecting line-level DOM.

### Requirement: Word-level spans only during active search

**Reason**: Search highlighting is supplied by the EmbedPDF search capability rather than FileViewer-created word spans.

**Migration**: Assert result counts, active-result navigation, and visible highlighting through the public renderer callbacks and rendered output.

### Requirement: Search highlight styling on text layer

**Reason**: The replacement engine owns highlight elements and styling rather than exposing pdf.js word-span classes.

**Migration**: Consumers continue to use `PdfRendererProps` search callbacks; tests no longer target internal text-layer classes.

