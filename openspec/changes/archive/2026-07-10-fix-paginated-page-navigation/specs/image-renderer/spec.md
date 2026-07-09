## MODIFIED Requirements

### Requirement: ImageChromeApi exposes page navigation for TIFF

When `file.kind` is `"image"` and the loaded file is TIFF with `pageCount > 1`, `ImageChromeApi` SHALL include `page`, `pageCount`, `canPrev`, `canNext`, `prevPage`, `nextPage`, `setPage`, and `subscribePageNavigate` on the `image` object, mirroring PDF chrome semantics. For non-TIFF images, `pageCount` SHALL be `1` and page navigation callbacks MAY be no-ops. Programmatic `setPage` SHALL smooth-scroll using known page geometry and SHALL NOT skip scroll solely because a prior visible-page report came from user scroll.

#### Scenario: Multi-page TIFF chrome API

- **WHEN** a 10-page TIFF is ready
- **THEN** `api.image.pageCount` SHALL be `10`
- **AND** `api.image.setPage(4)` SHALL set shell page to `4` and smooth-scroll the TIFF renderer to page 4

#### Scenario: Single-page PNG omits page toolbar semantics

- **WHEN** a PNG is ready
- **THEN** `api.image.pageCount` SHALL be `1`
