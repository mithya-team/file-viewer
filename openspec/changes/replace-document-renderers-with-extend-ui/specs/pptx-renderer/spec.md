## ADDED Requirements

### Requirement: PPTX vendor chrome and thumbnails are disabled

The internal Extend presentation adapter SHALL render with its vendor toolbar and thumbnail rail disabled. FileViewer's built-in or consumer-provided chrome SHALL remain the only package control surface.

#### Scenario: Presentation renders without vendor controls

- **WHEN** FileViewer renders a ready PPTX or POTX blob
- **THEN** the presentation adapter SHALL disable its own toolbar and thumbnails
- **THEN** FileViewer's `PptxChromeApi` SHALL remain available for page and zoom controls

## MODIFIED Requirements

### Requirement: Pagus engine pinned and internal only

PPTX rendering SHALL use pinned `@extend-ai/react-pptx` primitives from the Extend UI presentation stack. `PptxRenderer` SHALL remain internal and SHALL NOT be a runtime export from the package entry. The package SHALL NOT depend on Pagus packages.

#### Scenario: Presentation uses pinned Extend primitive

- **WHEN** `PptxRenderer` loads a ready PPTX or POTX blob
- **THEN** it SHALL initialize the pinned `@extend-ai/react-pptx` viewer with that normalized presentation data
- **THEN** it SHALL not invoke Pagus parsing or slide rendering APIs

#### Scenario: Public entry does not export PptxRenderer

- **WHEN** a consumer imports from `@file-viewer/react`
- **THEN** `PptxRenderer` SHALL NOT be a runtime export

### Requirement: Internal PptxRenderer vertical scroll stack

When `FileViewer` renders a ready PPTX detection, it SHALL mount an internal `PptxRenderer` that displays the presentation as a continuously vertically scrollable slide deck in document order. The adapter SHALL provide a scroll viewport suitable for FileViewer programmatic page navigation.

#### Scenario: Multi-slide deck shows stacked slides

- **WHEN** a PPTX blob loads with more than one slide
- **THEN** the viewer SHALL make every slide available in document order in its continuous scroll deck
- **THEN** adjacent slide surfaces SHALL have visible separation

#### Scenario: Single-slide deck uses same mode

- **WHEN** a PPTX blob loads with exactly one slide
- **THEN** the viewer SHALL render it in the same continuous scroll mode

### Requirement: Parse once per blob

`PptxRenderer` SHALL initialize the presentation document at most once for each stable buffered blob identity while mounted. Page or zoom changes SHALL use the loaded controller without reloading the source; a new blob SHALL dispose the previous presentation and initialize a new one.

#### Scenario: Page or zoom does not reload presentation

- **WHEN** a presentation has loaded for a blob
- **AND** FileViewer changes page or zoom
- **THEN** the adapter SHALL control the existing presentation instance without reloading the blob

#### Scenario: Source change initializes new presentation

- **WHEN** the blob changes to a different presentation
- **THEN** the adapter SHALL discard the previous controller state
- **THEN** it SHALL initialize the replacement blob as a new presentation

### Requirement: Lazy render slides near the viewport

`PptxRenderer` SHALL use the Extend presentation primitive's virtualized continuous-slide capability so that off-screen slide rendering is deferred and slides near the viewport are prefetched.

#### Scenario: Initial viewport does not eagerly render the full deck

- **WHEN** a multi-slide deck first loads with only its opening slides near the viewport
- **THEN** the adapter SHALL not require all slide surfaces to be rendered before it becomes ready

#### Scenario: Scrolling reveals later slide

- **WHEN** the user scrolls toward a later slide
- **THEN** the adapter SHALL make that slide available for display without reinitializing the whole presentation

### Requirement: Per-slot render failure does not fail entire file

When the presentation primitive can report a slide-specific render failure, that slide SHALL show a localized error state and other slides SHALL remain available. A document-level load or controller failure SHALL report through FileViewer's render-error fallback.

#### Scenario: Document-level presentation failure

- **WHEN** the presentation primitive reports a document-level load failure
- **THEN** `PptxRenderer` SHALL call `onError` with a render failure
- **THEN** FileViewer SHALL show its render fallback

### Requirement: Zoom scales slot dimensions without re-render

`PptxRenderer` SHALL pass FileViewer's zoom state to the loaded Extend presentation controller without reloading the presentation blob. A zoom change SHALL update the visible slide scale while retaining the current deck and navigation state.

#### Scenario: Zoom updates loaded presentation

- **WHEN** zoom changes from 100 to 150 for a loaded presentation
- **THEN** visible slides SHALL render at the requested scale
- **THEN** the presentation blob SHALL not be reloaded

### Requirement: Scroll drives visible page reporting

`PptxRenderer` SHALL report the active 1-based slide index to the parent when user scroll changes the visible slide. Programmatic `page` changes SHALL call the loaded presentation controller to scroll to the requested slide and SHALL suppress competing user-scroll reports until that command settles.

#### Scenario: Scrolling updates visible page

- **WHEN** the user scrolls so slide 4 becomes active
- **THEN** `onVisiblePageChange` SHALL be called with `4`

#### Scenario: External page jump scrolls slide

- **WHEN** FileViewer sends a programmatic request for page 3
- **THEN** the adapter SHALL call the presentation controller to navigate to slide 3
- **THEN** it SHALL report programmatic navigation settlement only after slide 3 is active and scrolling has settled

### Requirement: Static preview only

PPTX rendering SHALL NOT play animations, run presenter mode, execute embedded actions, or allow editing.

#### Scenario: Presentation includes animations

- **WHEN** a presentation defines animations or interactive actions
- **THEN** the renderer SHALL display only its static slide preview
- **THEN** it SHALL not execute or play those features

## REMOVED Requirements

### Requirement: SVG displayed via DOM mount

**Reason**: The Extend presentation primitive owns slide DOM generation and does not expose Pagus SVG strings as the presentation contract.

**Migration**: Validate static slide content through rendered integration fixtures rather than SVG-string mounting behavior.

### Requirement: Session slide cache without LRU cap

**Reason**: Slide caching and virtualization are owned by the Extend presentation primitive.

**Migration**: Validate that revisiting slides does not reload the presentation document; do not depend on a package-owned SVG cache implementation.

