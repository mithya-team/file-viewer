## MODIFIED Requirements

### Requirement: Scroll drives visible page reporting

`PptxRenderer` SHALL report the 1-based slide index with the highest intersection ratio in the viewport to the parent via `onVisiblePageChange` when the user scrolls, except during programmatic scroll-to-page. The programmatic guard SHALL remain active while slide geometry is missing and scroll is retrying, then until `scrollend` or `PROGRAMMATIC_SCROLL_GUARD_MS` (800ms). Programmatic `page` / nav-intent changes SHALL compute target `scrollTop` from slide geometry and smooth-scroll; they SHALL NOT skip scroll solely because a prior visible-page report came from user scroll.

#### Scenario: Scrolling updates visible page

- **WHEN** the user scrolls so that slide 4 has the highest intersection ratio
- **THEN** `onVisiblePageChange` SHALL be called with `4`

#### Scenario: Programmatic page jump scrolls slot

- **WHEN** the `page` prop changes to 3
- **THEN** the renderer SHALL smooth-scroll so slide 3 aligns at the start of the viewport

#### Scenario: Guard while geometry missing

- **WHEN** the parent sets `page` to 5 before slide geometry allows `getPageScrollTop`
- **THEN** `onVisiblePageChange` SHALL NOT overwrite the target while geometry retries are in progress

## ADDED Requirements

### Requirement: FileViewer PPTX page count seed and geometryReady

`FileViewer` SHALL seed `pptx.pageCount` at `0` until `PptxRenderer` reports slide count. `setPage` SHALL queue the latest pending page when count is unknown and SHALL bump nav intent on every call. `pptx.geometryReady` SHALL be a sync boolean true when slide geometry for programmatic jumps is available.

#### Scenario: Early setPage before slide count

- **WHEN** chrome mounts with `pptx.pageCount` equal to `0`
- **AND** the host calls `api.pptx.setPage(3)`
- **AND** the document later reports at least 3 slides
- **THEN** `pptx.page` SHALL become `3` and the renderer SHALL scroll to slide 3 once geometry is ready

#### Scenario: geometryReady on pptx chrome

- **WHEN** slide scroll geometry is not yet known
- **THEN** `api.pptx.geometryReady` SHALL be `false`
- **WHEN** geometry is known
- **THEN** `api.pptx.geometryReady` SHALL be `true`
