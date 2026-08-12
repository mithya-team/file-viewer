## ADDED Requirements

### Requirement: Workbook rendering uses the Extend XLSX primitive behind FileViewer chrome

For a ready `spreadsheet` detection whose MIME is not `text/csv`, `FileViewer` SHALL mount an internal workbook adapter over pinned `@extend-ai/react-xlsx` primitives. The adapter SHALL consume the normalized buffered blob, not the original consumer source, and SHALL keep sheet names and active-sheet selection synchronized with `SpreadsheetChromeApi`.

#### Scenario: Workbook sheet selection from external chrome

- **WHEN** an XLSX or XLS workbook has loaded with multiple sheets
- **AND** a consumer calls `api.spreadsheet.setActiveSheetIndex(1)`
- **THEN** the internal workbook viewer SHALL display the second sheet
- **THEN** `api.spreadsheet.activeSheetIndex` SHALL be `1`

#### Scenario: User changes the visible workbook sheet

- **WHEN** the workbook viewer changes its active sheet through its internal sheet surface
- **THEN** FileViewer SHALL update the active sheet reported to custom chrome

### Requirement: XLS support is retained

The Extend-based workbook adapter SHALL render supported legacy XLS blobs in addition to XLSX blobs; it SHALL not remove the existing `application/vnd.ms-excel` route.

#### Scenario: Detected XLS renders through workbook adapter

- **WHEN** a buffered blob is detected as `kind: "spreadsheet"` with MIME `application/vnd.ms-excel`
- **THEN** the workbook adapter SHALL attempt rendering it through the Extend XLSX primitive path
- **THEN** parser failure SHALL use FileViewer's render-error fallback rather than route the blob as text or CSV

### Requirement: CSV is decoded from the normalized buffered blob

For a ready spreadsheet detection with MIME `text/csv`, the internal CSV adapter SHALL decode the already-buffered blob to text before passing it to the grid. It SHALL not re-fetch the original consumer source or use content text to alter detection.

#### Scenario: Stream source becomes CSV text

- **WHEN** a `ReadableStream<Uint8Array>` source has been buffered and detected as `text/csv`
- **THEN** the CSV adapter SHALL decode that buffered blob and render the resulting text in the CSV grid

#### Scenario: UTF BOM is present

- **WHEN** a detected CSV blob includes a recognized UTF byte-order mark
- **THEN** the adapter SHALL decode the text using the corresponding UTF encoding before parsing columns and rows

### Requirement: Spreadsheet adapters keep FileViewer as the chrome owner

The workbook and CSV adapters SHALL disable vendor upload, download, and toolbar controls. CSV SHALL expose no workbook-level sheet controls, consistent with the existing `SpreadsheetChromeApi` contract.

#### Scenario: CSV default chrome has no sheet tabs

- **WHEN** the active detection is a CSV spreadsheet
- **THEN** FileViewer default chrome SHALL not render workbook sheet controls
- **THEN** the internal CSV adapter SHALL not render an independent upload or download toolbar

