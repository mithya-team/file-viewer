## MODIFIED Requirements

### Requirement: Shell owns image page state for TIFF

`FileViewer` SHALL own `imagePage` (1-based, default `1`) and `imagePageCount` when displaying TIFF. When `source` changes, `imagePage` SHALL reset to `1` and `imagePageCount` SHALL reset to `0` until the TIFF IFD count is known. While `imagePageCount` is `0`, `setPage` SHALL NOT clamp against count `1`; it SHALL queue the latest pending page. When `imagePageCount` becomes known, `FileViewer` SHALL apply the pending page (or clamp the current page) into `[1, imagePageCount]`.

#### Scenario: New source resets page

- **WHEN** the user views TIFF page 5
- **AND** `source` changes to another file
- **THEN** `imagePage` SHALL be `1` before the new file renders
- **AND** `imagePageCount` SHALL be `0` until the new IFD count is known

#### Scenario: Page count from IFD list

- **WHEN** a TIFF with 8 IFDs becomes ready
- **THEN** `imagePageCount` SHALL be `8`

#### Scenario: Early setPage before IFD count

- **WHEN** `imagePageCount` is `0`
- **AND** the host calls `api.image.setPage(4)`
- **AND** a TIFF with at least 4 IFDs becomes ready
- **THEN** `imagePage` SHALL become `4`

### Requirement: ImageChromeApi exposes page navigation for TIFF

When `file.kind` is `"image"` and the loaded file is TIFF with `pageCount > 1`, `ImageChromeApi` SHALL include `page`, `pageCount`, `geometryReady`, `canPrev`, `canNext`, `prevPage`, `nextPage`, `setPage`, and `subscribePageNavigate` on the `image` object, mirroring PDF chrome semantics. For non-TIFF images, `pageCount` SHALL be `1`, `geometryReady` MAY be `true`, and page navigation callbacks MAY be no-ops. Every `setPage` SHALL bump nav intent. Programmatic `setPage` SHALL smooth-scroll using known page geometry and SHALL NOT skip scroll solely because a prior visible-page report came from user scroll. Programmatic IO guard SHALL stay active while geometry is missing and retrying.

#### Scenario: Multi-page TIFF chrome API

- **WHEN** a 10-page TIFF is ready
- **THEN** `api.image.pageCount` SHALL be `10`
- **AND** `api.image.setPage(4)` SHALL set shell page to `4` and smooth-scroll the TIFF renderer to page 4

#### Scenario: Single-page PNG omits page toolbar semantics

- **WHEN** a PNG is ready
- **THEN** `api.image.pageCount` SHALL be `1`

#### Scenario: geometryReady on image chrome for TIFF

- **WHEN** TIFF page sizes for scroll tops are not yet known
- **THEN** `api.image.geometryReady` SHALL be `false`
- **WHEN** sizes are known
- **THEN** `api.image.geometryReady` SHALL be `true`
