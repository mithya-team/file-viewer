## MODIFIED Requirements

### Requirement: Scroll position drives current page

`PdfRenderer` SHALL report the active page in the PDF viewport to the parent via `onVisiblePageChange` when the user scrolls. Programmatic `page` changes SHALL wait until EmbedPDF has emitted a layout-ready signal, then invoke the loaded PDF control to scroll to the requested page. The renderer SHALL retain only the latest navigation intent until it can be dispatched, SHALL suppress competing visible-page reports while that command is pending or EmbedPDF reports a programmatic page change, and SHALL allow a later command after user scrolling.

#### Scenario: Scrolling updates visible page

- **WHEN** the user scrolls so page 3 becomes active
- **THEN** `onVisiblePageChange` SHALL be called with `3`

#### Scenario: Programmatic jump waits for layout

- **WHEN** the parent requests page 5 before EmbedPDF has a usable scroll layout
- **THEN** the renderer SHALL retain page 5 as the latest pending target
- **WHEN** EmbedPDF emits its layout-ready signal
- **THEN** the renderer SHALL invoke the loaded PDF control to navigate to page 5

#### Scenario: Programmatic jump does not fight parent page state

- **WHEN** the `page` prop changes to 5
- **AND** the renderer starts programmatic navigation to page 5
- **THEN** spurious `onVisiblePageChange` callbacks during that navigation SHALL be suppressed

#### Scenario: setPage after user scroll still scrolls

- **WHEN** the user has scrolled so chrome shows page 6
- **AND** the parent sets `page` to 15 after geometry is ready
- **THEN** the loaded PDF control SHALL navigate toward page 15

### Requirement: Zoom applies to all pages in the scroll stack

`PdfRenderer` SHALL translate its percent `zoom` prop to the EmbedPDF zoom control for the loaded document. It SHALL issue a zoom command only when the document identity or requested zoom value changes, not when EmbedPDF supplies a new scoped control wrapper during a page-state re-render. A zoom change SHALL update visible pages without reopening the document and SHALL preserve the scrollable document surface.

#### Scenario: Page update does not reissue zoom

- **WHEN** a PDF document is open at zoom 100
- **AND** a user-scroll page update re-renders the adapter
- **THEN** the renderer SHALL NOT request zoom 100 again solely because EmbedPDF supplied a new scoped zoom control wrapper

#### Scenario: Zoom change updates visible page

- **WHEN** page 1 is visible at zoom 100
- **AND** `zoom` changes to 150
- **THEN** page 1 SHALL update to the requested scale
- **THEN** the PDF engine SHALL not reopen the document for the same blob

#### Scenario: Zoom change does not eagerly render all pages

- **WHEN** a 10-page PDF has only page 1 near the viewport
- **AND** `zoom` changes
- **THEN** the adapter SHALL not require pages 2 through 10 to be painted before the zoom update completes
