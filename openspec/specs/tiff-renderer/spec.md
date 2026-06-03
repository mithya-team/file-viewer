# tiff-renderer Specification

## Purpose

Classical TIFF detection and internal multi-page scroll rendering via UTIF.js: lazy per-page decode, display `blob:` URLs, and per-slot error handling.

## Requirements

### Requirement: Classical TIFF magic-byte detection

`detectFileKind` SHALL classify a blob as `kind: "image"` with MIME `image/tiff` when the sniff sample starts with little-endian TIFF signature `49 49 2A 00` (`II*\0`) or big-endian `4D 4D 00 2A` (`MM\0*`), before OLE/OpenXML sniffing.

#### Scenario: Little-endian TIFF without MIME

- **WHEN** the loaded blob begins with `II*\0`
- **AND** `Blob.type` is empty or `application/octet-stream`
- **THEN** detection SHALL return `kind: "image"` and `mimeType` of `image/tiff`

#### Scenario: Big-endian TIFF without MIME

- **WHEN** the loaded blob begins with `MM\0*`
- **AND** `Blob.type` is empty
- **THEN** detection SHALL return `kind: "image"` and `mimeType` of `image/tiff`

#### Scenario: image/tiff MIME after sniffing

- **WHEN** the server sets `Blob.type` to `image/tiff` or `image/tif`
- **AND** magic bytes match classical TIFF
- **THEN** detection SHALL return `kind: "image"` with that normalized MIME

### Requirement: TIFF is not BigTIFF in v1

The package SHALL NOT claim support for BigTIFF. Files that require BigTIFF offsets beyond classic TIFF limits MAY fail detection or decode and SHALL surface through the normal unsupported or render-error paths without a separate public format kind.

#### Scenario: BigTIFF file not guaranteed

- **WHEN** a consumer loads a BigTIFF-only file
- **THEN** the viewer MAY show unsupported or a render error
- **AND** SHALL NOT introduce a new public `FileKind` for BigTIFF

### Requirement: Internal TiffRenderer scroll stack

When `FileViewer` renders a ready TIFF image, it SHALL mount an internal `TiffRenderer` (name may vary) that displays all IFD-backed page slots in a single vertically scrollable column with consistent gaps between slots, analogous to the PDF multi-page stack.

#### Scenario: Multi-IFD TIFF shows stacked slots

- **WHEN** a TIFF blob decodes to more than one IFD from `UTIF.decode`
- **THEN** the scroll container SHALL contain one slot per IFD index in order
- **THEN** adjacent slots SHALL be separated by a visible gap

#### Scenario: Single-IFD TIFF uses same layout

- **WHEN** a TIFF blob decodes to exactly one IFD
- **THEN** the scroll container SHALL contain exactly one page slot

### Requirement: Lazy decode pages near the viewport

`TiffRenderer` SHALL decode raster data for a page only when that page's slot intersects the scroll viewport extended by a root margin comparable to the PDF renderer (approximately 600px), using `IntersectionObserver`.

#### Scenario: Off-screen page not decoded initially

- **WHEN** a multi-page TIFF has loaded
- **AND** only page 1's slot intersects the viewport with margin
- **THEN** `UTIF.decodeImage` SHALL NOT be invoked for non-intersecting page indices

#### Scenario: Scrolling into view triggers decode

- **WHEN** the user scrolls so that page 2's slot intersects the viewport with margin
- **THEN** the renderer SHALL decode IFD index 1 (page 2) and assign a display URL to that slot

### Requirement: Display URLs use blob URLs from decoded PNG

Each successfully decoded page SHALL be shown via an `HTMLImageElement` whose `src` is a `blob:` URL created from a PNG `Blob` produced from decoded RGBA (canvas `toBlob`), not a `data:` URL embedded in the attribute.

#### Scenario: Display URL is revocable object URL

- **WHEN** page 1 has been decoded for display
- **THEN** the slot's `src` SHALL use `URL.createObjectURL` on a PNG `Blob`
- **AND** the URL SHALL be revoked when the TIFF `source` changes or the renderer unmounts

### Requirement: Session display URL cache without LRU cap

`TiffRenderer` SHALL retain a `Map` from 1-based page index to display `blob:` URL for every page successfully decoded during the current `source` lifetime. It SHALL NOT apply an LRU or maximum entry cap in v1. It SHALL revoke all cached URLs when `source` or the backing blob identity changes.

#### Scenario: Revisit decoded page reuses cache

- **WHEN** page 3 was previously decoded and cached
- **AND** the user scrolls away and back to page 3 without changing `source`
- **THEN** the renderer SHALL reuse the cached display URL without calling `UTIF.decodeImage` again

#### Scenario: Source change clears cache

- **WHEN** `source` changes to a different TIFF
- **THEN** all prior display URLs SHALL be revoked
- **AND** the decode cache map SHALL be empty before decoding the new file

### Requirement: Per-slot decode failure does not fail entire file

When `UTIF.decodeImage` or `UTIF.toRGBA8` fails for a specific IFD, that page slot SHALL show a localized error state. Other slots SHALL continue to decode and display when viewed. The whole file SHALL become unsupported only when `UTIF.decode` fails for the blob.

#### Scenario: Metadata IFD fails decode

- **WHEN** IFD 2 cannot be decoded to RGBA
- **AND** IFD 1 decodes successfully
- **THEN** slot 1 SHALL show the image
- **AND** slot 2 SHALL show a slot-level error message
- **AND** detection SHALL remain `kind: "image"`

#### Scenario: Unreadable TIFF blob

- **WHEN** `UTIF.decode` throws or returns no usable IFDs for the buffered blob
- **THEN** the renderer SHALL call `onError` with a render failure
- **AND** `FileViewer` SHALL show the render fallback path

### Requirement: Scroll drives visible page reporting

`TiffRenderer` SHALL report the 1-based page index with the highest intersection ratio in the viewport to the parent via `onVisiblePageChange` when the user scrolls, except during programmatic scroll-to-page guarded the same way as PDF (approximately 800ms after `scrollIntoView`).

#### Scenario: Scrolling updates visible page

- **WHEN** the user scrolls so that page 4 has the highest intersection ratio
- **THEN** `onVisiblePageChange` SHALL be called with `4`

#### Scenario: Programmatic page jump scrolls slot

- **WHEN** the `page` prop changes to 3
- **THEN** the renderer SHALL scroll page 3's slot into view with `scrollIntoView`
- **THEN** spurious `onVisiblePageChange` during the guard window SHALL be suppressed

### Requirement: Download uses original TIFF blob

`FileViewer` SHALL set `file.downloadUrl` to an object URL of the original buffered TIFF `Blob`, not to per-page decoded PNG blob URLs.

#### Scenario: Download link preserves TIFF bytes

- **WHEN** a TIFF is ready and default chrome shows Download
- **THEN** the download href SHALL reference the original TIFF blob URL
- **AND** SHALL NOT download only the currently visible decoded PNG page
