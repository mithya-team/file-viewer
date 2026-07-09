# pptx-renderer Specification

## Purpose
TBD - created by archiving change add-pptx-renderer. Update Purpose after archive.
## Requirements
### Requirement: PPTX OpenXML magic-byte detection

`detectFileKind` SHALL classify a blob as `kind: "pptx"` when the sniff sample starts with PK zip signature `50 4B 03 04` and the latin1-decoded sample contains the substring `ppt/`, unless an earlier OpenXML sniff matches `xl/` or `word/`.

#### Scenario: PPTX zip without MIME

- **WHEN** the loaded blob begins with PK zip signature
- **AND** the sniff sample contains `ppt/slides/`
- **AND** `Blob.type` is empty or `application/zip`
- **THEN** detection SHALL return `kind: "pptx"`

#### Scenario: PPTX does not steal DOCX or XLSX

- **WHEN** the sniff sample contains `word/document.xml`
- **THEN** detection SHALL return `kind: "docx"` regardless of other zip paths

- **WHEN** the sniff sample contains `xl/`
- **THEN** detection SHALL return `kind: "spreadsheet"` regardless of other zip paths

### Requirement: PPTX and POTX MIME detection after sniffing

`detectFileKind` SHALL return `kind: "pptx"` when loaded MIME is `application/vnd.openxmlformats-officedocument.presentationml.presentation` or `application/vnd.openxmlformats-officedocument.presentationml.template`, evaluated after magic-byte rules and before generic unsupported fallback.

#### Scenario: PPTX MIME on zip payload

- **WHEN** `Blob.type` is `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **AND** magic bytes are PK zip
- **THEN** detection SHALL return `kind: "pptx"`

#### Scenario: POTX template MIME

- **WHEN** `Blob.type` is `application/vnd.openxmlformats-officedocument.presentationml.template`
- **AND** magic bytes are PK zip
- **THEN** detection SHALL return `kind: "pptx"`

### Requirement: Pagus engine pinned and internal only

PPTX rendering SHALL use `@pagus-kit/core@0.1.1` for `parse` and `@pagus-kit/renderer@0.1.1` for `buildFontSubstitutes` and `renderSlide`. The package SHALL NOT depend on `@pagus-kit/react`. `PptxRenderer` SHALL remain internal (not exported from the package entry).

#### Scenario: Parse uses pinned core

- **WHEN** `PptxRenderer` loads a ready PPTX blob
- **THEN** it SHALL call `parse` from `@pagus-kit/core@0.1.1` on the buffered `ArrayBuffer`

#### Scenario: Public entry does not export PptxRenderer

- **WHEN** a consumer imports from `@file-viewer/react`
- **THEN** `PptxRenderer` SHALL NOT be a runtime export

### Requirement: Internal PptxRenderer vertical scroll stack

When `FileViewer` renders a ready PPTX detection, it SHALL mount an internal `PptxRenderer` that displays all slide slots in a single vertically scrollable column with gaps between slots, reusing the PDF/TIFF scroll layout classes (`PDF_SCROLL_ROOT_CLASS`, `PDF_PAGE_COLUMN_CLASS`, `PDF_PAGE_SLOT_CLASS`, `PAGE_GAP`).

#### Scenario: Multi-slide deck shows stacked slots

- **WHEN** a PPTX blob parses to more than one slide
- **THEN** the scroll container SHALL contain one slot per slide in order
- **THEN** adjacent slots SHALL be separated by a visible gap

#### Scenario: Single-slide deck uses same layout

- **WHEN** a PPTX blob parses to exactly one slide
- **THEN** the scroll container SHALL contain exactly one slide slot

### Requirement: Parse once per blob

`PptxRenderer` SHALL call `pagusParse` exactly once per buffered blob identity (per `source` / `blob` prop change). It SHALL build `fontSubstitutes` via `buildFontSubstitutes(presentation.fonts)` once after a successful parse.

#### Scenario: Source change re-parses

- **WHEN** the `blob` prop changes to a different presentation
- **THEN** the renderer SHALL discard the prior parsed presentation and slide cache before parsing the new blob

#### Scenario: Parse failure fails the document

- **WHEN** `parse` throws or returns zero slides
- **THEN** the renderer SHALL call `onError` with a render failure
- **AND** `FileViewer` SHALL show the render fallback path

### Requirement: Lazy render slides near the viewport

`PptxRenderer` SHALL call `renderSlide` for a slide only when that slide's slot intersects the scroll viewport extended by `OBSERVER_MARGIN` (600px), using `IntersectionObserver` via `usePaginatedScrollStack` or equivalent behavior.

#### Scenario: Off-screen slide not rendered initially

- **WHEN** a multi-slide deck has loaded
- **AND** only slide 1's slot intersects the viewport with margin
- **THEN** `renderSlide` SHALL NOT be invoked for non-intersecting slide indices

#### Scenario: Scrolling into view triggers render

- **WHEN** the user scrolls so that slide 2's slot intersects the viewport with margin
- **THEN** the renderer SHALL call `renderSlide` for slide 2 and display the returned SVG in that slot

### Requirement: SVG displayed via DOM mount

Each successfully rendered slide SHALL be shown by mounting the Pagus SVG string into the DOM (e.g. via `DOMParser` + `appendChild` on a wrapper `div`). The wrapper SHALL size the SVG to the slot using CSS (`width`/`height` 100% on the root `svg` element).

#### Scenario: Text renders via foreignObject

- **WHEN** a slide SVG contains `foreignObject` HTML text from Pagus
- **THEN** the text SHALL be visible in the mounted DOM without rasterizing to `<img>`

### Requirement: Session slide cache without LRU cap

`PptxRenderer` SHALL retain a `Map` from 1-based slide index to `{ svg, width, height }` for every slide successfully rendered during the current blob lifetime. It SHALL NOT apply an LRU cap in v1. It SHALL clear the map when the blob changes or the renderer unmounts.

#### Scenario: Revisit rendered slide reuses cache

- **WHEN** slide 3 was previously rendered and cached
- **AND** the user scrolls away and back to slide 3 without changing the blob
- **THEN** the renderer SHALL reuse the cached SVG without calling `renderSlide` again

### Requirement: Per-slot render failure does not fail entire file

When `renderSlide` fails for a specific slide, that slot SHALL show a localized error state. Other slots SHALL continue to render when viewed. The whole file SHALL fail only when `parse` fails.

#### Scenario: One bad slide

- **WHEN** slide 2 `renderSlide` throws
- **AND** slide 1 rendered successfully
- **THEN** slot 1 SHALL show the slide SVG
- **AND** slot 2 SHALL show a slot-level error message

### Requirement: Zoom scales slot dimensions without re-render

`PptxRenderer` SHALL apply shell zoom as `scale = zoom / 100` on slot `width` and `height` using cached `rendered.width` and `rendered.height`. It SHALL NOT call `renderSlide` again solely because zoom changed.

#### Scenario: Zoom in enlarges slot

- **WHEN** zoom changes from 100 to 150
- **AND** a slide is already cached with dimensions 960×540
- **THEN** the slot SHALL layout at 1440×810
- **AND** `renderSlide` SHALL NOT be invoked again for that slide

#### Scenario: 100% zoom uses native Pagus pixel size

- **WHEN** zoom is 100
- **THEN** each rendered slot SHALL use the `width` and `height` returned by `renderSlide` as its layout size

### Requirement: Scroll drives visible page reporting

`PptxRenderer` SHALL report the 1-based slide index with the highest intersection ratio in the viewport to the parent via `onVisiblePageChange` when the user scrolls, except during programmatic scroll-to-page guarded until `scrollend` or `PROGRAMMATIC_SCROLL_GUARD_MS` (800ms). Programmatic `page` changes SHALL compute target `scrollTop` from slide geometry and smooth-scroll; they SHALL NOT skip scroll solely because a prior visible-page report came from user scroll.

#### Scenario: Scrolling updates visible page

- **WHEN** the user scrolls so that slide 4 has the highest intersection ratio
- **THEN** `onVisiblePageChange` SHALL be called with `4`

#### Scenario: Programmatic page jump scrolls slot

- **WHEN** the `page` prop changes to 3
- **THEN** the renderer SHALL smooth-scroll so slide 3 aligns at the start of the viewport
- **THEN** spurious `onVisiblePageChange` during the guard window SHALL be suppressed

### Requirement: Download uses original PPTX blob

`FileViewer` SHALL set `file.downloadUrl` to an object URL of the original buffered PPTX `Blob`, not to per-slide SVG strings.

#### Scenario: Download preserves PPTX bytes

- **WHEN** a PPTX is ready and default chrome shows Download
- **THEN** the download href SHALL reference the original PPTX blob URL

### Requirement: Static preview only

PPTX rendering SHALL NOT play animations, run presenter mode, or allow editing. Animation metadata from the IR MAY be ignored.

#### Scenario: Entrance animations not played

- **WHEN** a slide defines entrance animations in the Pagus IR
- **THEN** the renderer SHALL show the static fully-rendered slide SVG without animation playback

