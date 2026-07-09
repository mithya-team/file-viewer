## MODIFIED Requirements

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
