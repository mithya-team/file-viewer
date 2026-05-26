## ADDED Requirements

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

### Requirement: Default chrome provides image zoom controls

`FileViewerDefaultChrome` SHALL show zoom out, current zoom percentage, and zoom in for `api.file.kind === "image"`, using `api.image.zoomOut`, `api.image.zoom`, and `api.image.zoomIn`. Image chrome SHALL NOT show PDF page controls.

#### Scenario: Default chrome for image

- **WHEN** an image file is ready
- **AND** `chrome="default"`
- **THEN** the toolbar SHALL display zoom −, zoom %, and zoom + bound to `api.image`

### Requirement: Render errors clear on image zoom change

`FileViewer` SHALL clear a prior image render error when `imageZoom` changes, so the renderer can retry (same behavior as PDF page/zoom recovery).

#### Scenario: Zoom change clears render error

- **WHEN** the image renderer reported a render error
- **AND** `imageZoom` changes
- **THEN** `FileViewer` SHALL clear that render error and attempt to show the image again
