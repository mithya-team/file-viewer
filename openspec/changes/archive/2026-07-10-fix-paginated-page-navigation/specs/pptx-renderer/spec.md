## MODIFIED Requirements

### Requirement: Scroll drives visible page reporting

`PptxRenderer` SHALL report the 1-based slide index with the highest intersection ratio in the viewport to the parent via `onVisiblePageChange` when the user scrolls, except during programmatic scroll-to-page guarded until `scrollend` or `PROGRAMMATIC_SCROLL_GUARD_MS` (800ms). Programmatic `page` changes SHALL compute target `scrollTop` from slide geometry and smooth-scroll; they SHALL NOT skip scroll solely because a prior visible-page report came from user scroll.

#### Scenario: Scrolling updates visible page

- **WHEN** the user scrolls so that slide 4 has the highest intersection ratio
- **THEN** `onVisiblePageChange` SHALL be called with `4`

#### Scenario: Programmatic page jump scrolls slot

- **WHEN** the `page` prop changes to 3
- **THEN** the renderer SHALL smooth-scroll so slide 3 aligns at the start of the viewport
- **THEN** spurious `onVisiblePageChange` during the guard window SHALL be suppressed
