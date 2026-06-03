## ADDED Requirements

### Requirement: FileViewer routes TIFF to TiffRenderer

When detection yields `kind: "image"` and the blob is identified as classical TIFF (magic bytes or `image/tiff` / `image/tif` MIME), `FileViewer` SHALL render the internal multi-page TIFF scroll renderer instead of `ImageRenderer`. All other image MIME/sniff paths SHALL continue to use `ImageRenderer` with a single object URL.

#### Scenario: PNG still uses ImageRenderer

- **WHEN** detection yields `kind: "image"` for a PNG signature
- **THEN** `FileViewer` SHALL mount `ImageRenderer` with `createObjectURL(blob)`
- **AND** SHALL NOT mount the TIFF scroll renderer

#### Scenario: TIFF uses scroll renderer

- **WHEN** detection yields `kind: "image"` for classical TIFF
- **THEN** `FileViewer` SHALL mount the internal TIFF scroll renderer with the buffered blob
- **AND** SHALL NOT pass the raw TIFF blob URL to a single `<img>` in `ImageRenderer`

### Requirement: Shell owns image page state for TIFF

`FileViewer` SHALL own `imagePage` (1-based, default `1`) and `imagePageCount` when displaying TIFF. When `source` changes, `imagePage` SHALL reset to `1` and `imagePageCount` SHALL reset until the TIFF IFD count is known. `imagePage` SHALL be clamped to `[1, imagePageCount]` when `imagePageCount` changes.

#### Scenario: New source resets page

- **WHEN** the user views TIFF page 5
- **AND** `source` changes to another file
- **THEN** `imagePage` SHALL be `1` before the new file renders

#### Scenario: Page count from IFD list

- **WHEN** a TIFF with 8 IFDs becomes ready
- **THEN** `imagePageCount` SHALL be `8`

### Requirement: ImageChromeApi exposes page navigation for TIFF

When `file.kind` is `"image"` and the loaded file is TIFF with `pageCount > 1`, `ImageChromeApi` SHALL include `page`, `pageCount`, `canPrev`, `canNext`, `prevPage`, `nextPage`, and `setPage` on the `image` object, mirroring PDF chrome semantics. For non-TIFF images, `pageCount` SHALL be `1` and page navigation callbacks MAY be no-ops.

#### Scenario: Multi-page TIFF chrome API

- **WHEN** a 10-page TIFF is ready
- **THEN** `api.image.pageCount` SHALL be `10`
- **AND** `api.image.setPage(4)` SHALL set shell page to `4` and scroll the TIFF renderer to page 4

#### Scenario: Single-page PNG omits page toolbar semantics

- **WHEN** a PNG is ready
- **THEN** `api.image.pageCount` SHALL be `1`

### Requirement: Render errors clear on image page change

`FileViewer` SHALL clear a prior TIFF or image render error when `imagePage` changes, in addition to when `imageZoom` changes.

#### Scenario: Page change clears render error

- **WHEN** the TIFF renderer reported a render error
- **AND** `imagePage` changes
- **THEN** `FileViewer` SHALL clear that render error and attempt to show content again

### Requirement: TIFF pages apply shell image zoom

The internal TIFF scroll renderer SHALL receive `imageZoom` from the shell and apply the same width-percentage scaling rules as `ImageRenderer` to each decoded page `<img>` inside the scroll stack.

#### Scenario: Zoom applies to TIFF slot

- **WHEN** `imageZoom` is `150`
- **AND** page 2 is decoded and visible
- **THEN** page 2's displayed image width SHALL reflect 150% per image zoom layout rules

## MODIFIED Requirements

### Requirement: Default chrome provides image zoom controls

`FileViewerDefaultChrome` SHALL show zoom out, current zoom percentage, and zoom in for `api.file.kind === "image"`, using `api.image.zoomOut`, `api.image.zoom`, and `api.image.zoomIn`. For multi-page TIFF (`api.image.pageCount > 1`), the toolbar SHALL also show previous page, page number input, next page, and ` / {pageCount}` using the same control pattern as PDF default chrome. Image chrome SHALL NOT show PDF-specific controls when `file.kind` is not `"image"`.

#### Scenario: Default chrome for single-page image

- **WHEN** a single-page PNG is ready
- **AND** `chrome="default"`
- **THEN** the toolbar SHALL display zoom −, zoom %, and zoom +
- **AND** SHALL NOT display page prev/next controls

#### Scenario: Default chrome for multi-page TIFF

- **WHEN** a multi-page TIFF is ready with `pageCount` greater than 1
- **AND** `chrome="default"`
- **THEN** the toolbar SHALL display page prev, page input, page count label, page next, and zoom controls bound to `api.image`
