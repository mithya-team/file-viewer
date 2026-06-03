# image-renderer Specification

## Purpose

Shell-owned image zoom and pan for native raster images; TIFF routing, page state, and multi-page chrome for classical TIFF scroll viewing.
## Requirements
### Requirement: Shell owns image zoom state

`FileViewer` SHALL own `imageZoom` as a percentage (default `100`) when the detected file kind is `image`. When `source` changes, `imageZoom` SHALL reset to `100`. Zoom state SHALL NOT be owned solely inside `ImageRenderer`.

#### Scenario: New source resets zoom

- **WHEN** the user loads image A at zoom 150%
- **AND** `source` changes to image B
- **THEN** `imageZoom` SHALL be `100` before image B renders

### Requirement: Image zoom bounds

Image zoom percentage SHALL be clamped to the inclusive range **40** through **200**. Toolbar `zoomIn`, `zoomOut`, and `setZoom` SHALL respect this range.

#### Scenario: Toolbar zoom in stops at max

- **WHEN** `imageZoom` is `195`
- **AND** the user invokes `api.image.zoomIn`
- **THEN** `imageZoom` SHALL become `200`

#### Scenario: Toolbar zoom out stops at min

- **WHEN** `imageZoom` is `45`
- **AND** the user invokes `api.image.zoomOut`
- **THEN** `imageZoom` SHALL become `40`

#### Scenario: setZoom clamps high and low

- **WHEN** the consumer calls `api.image.setZoom(250)`
- **THEN** `imageZoom` SHALL be `200`
- **WHEN** the consumer calls `api.image.setZoom(10)`
- **THEN** `imageZoom` SHALL be `40`

### Requirement: Toolbar zoom step is ten percent

`api.image.zoomIn` and `api.image.zoomOut` SHALL change `imageZoom` by **10** percentage points per invocation, after clamping.

#### Scenario: Zoom in from 100

- **WHEN** `imageZoom` is `100`
- **AND** the user invokes `api.image.zoomIn`
- **THEN** `imageZoom` SHALL be `110`

### Requirement: Sequential click step zoom

`api.image.stepZoomIn` (and the renderer single-click gesture wired to it) SHALL apply sequential increments from the current zoom:

1. While zoom `< 150`: add **50** (capped at 200)
2. Else while zoom `< 175`: add **25** (capped at 200)
3. Else: add **10** (capped at 200)

#### Scenario: First three clicks from 100

- **WHEN** `imageZoom` is `100`
- **AND** the user single-clicks the image three times (without a pan drag between down and up)
- **THEN** zoom levels after each click SHALL be `150`, then `175`, then `185`

#### Scenario: Further clicks add ten until max

- **WHEN** `imageZoom` is `185`
- **AND** the user single-clicks the image once
- **THEN** `imageZoom` SHALL be `195`

#### Scenario: At max zoom click is no-op

- **WHEN** `imageZoom` is `200`
- **AND** the user single-clicks the image
- **THEN** `imageZoom` SHALL remain `200`

### Requirement: Double-click resets zoom

Double-clicking the image in `ImageRenderer` SHALL set `imageZoom` to **100** via `api.image.resetZoom` / shell reset.

#### Scenario: Reset from zoomed state

- **WHEN** `imageZoom` is `175`
- **AND** the user double-clicks the image
- **THEN** `imageZoom` SHALL be `100`

### Requirement: Mouse zoom works without chrome

Single-click step zoom and double-click reset SHALL function when `chrome="none"`. Hiding chrome SHALL NOT disable pointer zoom gestures.

#### Scenario: Content-only mode still zooms

- **WHEN** `FileViewer` has `chrome="none"` and displays an image
- **AND** the user single-clicks the image
- **THEN** `imageZoom` SHALL increase according to the sequential step rules

### Requirement: ImageRenderer applies zoom to layout

`ImageRenderer` SHALL receive `zoom` from the shell and render the image at that zoom percentage using width-based scaling inside a scrollable viewport (`overflow-auto`), enabling scroll when the scaled image exceeds the viewport.

#### Scenario: Zoom prop affects rendered width

- **WHEN** `zoom` is `150`
- **THEN** the image layout width SHALL reflect 150% of the zoom baseline used by the renderer (percentage width relative to the scroll content box)

### Requirement: Pan when zoomed past viewport

When the scaled image overflows the scroll container, `ImageRenderer` SHALL allow pointer drag to pan (scroll) the image. Pan gestures SHALL NOT trigger sequential step zoom.

#### Scenario: Drag does not step zoom

- **WHEN** the image is pannable at zoom 150%
- **AND** the user pointer-drags to pan
- **THEN** `imageZoom` SHALL remain `150`

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

### Requirement: TIFF pages apply shell image zoom

The internal TIFF scroll renderer SHALL receive `imageZoom` from the shell and apply the same width-percentage scaling rules as `ImageRenderer` to each decoded page `<img>` inside the scroll stack.

#### Scenario: Zoom applies to TIFF slot

- **WHEN** `imageZoom` is `150`
- **AND** page 2 is decoded and visible
- **THEN** page 2's displayed image width SHALL reflect 150% per image zoom layout rules

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

### Requirement: Render errors clear on image zoom or page change

`FileViewer` SHALL clear a prior image or TIFF render error when `imageZoom` or `imagePage` changes, so the renderer can retry (same behavior as PDF page/zoom recovery).

#### Scenario: Zoom change clears render error

- **WHEN** the image renderer reported a render error
- **AND** `imageZoom` changes
- **THEN** `FileViewer` SHALL clear that render error and attempt to show the image again

#### Scenario: Page change clears render error

- **WHEN** the TIFF renderer reported a render error
- **AND** `imagePage` changes
- **THEN** `FileViewer` SHALL clear that render error and attempt to show content again

