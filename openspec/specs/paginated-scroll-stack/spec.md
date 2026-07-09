# paginated-scroll-stack Specification

## Purpose
TBD - created by archiving change add-pptx-renderer. Update Purpose after archive.
## Requirements
### Requirement: usePaginatedScrollStack hook

The package SHALL provide `usePaginatedScrollStack` in `packages/file-viewer/src/renderers/usePaginatedScrollStack.ts` for internal renderer use. The hook SHALL return a `scrollRef` for the scroll root and SHALL set up dual `IntersectionObserver` instances on `[data-page-num]` slot elements inside that root.

#### Scenario: Hook returns scroll ref

- **WHEN** an internal renderer calls `usePaginatedScrollStack` with valid options
- **THEN** it SHALL receive a `scrollRef` to attach to the scroll container element

### Requirement: Lazy prefetch via onPageNearViewport

The hook SHALL invoke `onPageNearViewport(pageNum)` when a slot with `data-page-num` intersects the scroll root extended by `OBSERVER_MARGIN` (600px) vertically.

#### Scenario: Near viewport triggers callback

- **WHEN** slide slot 2 enters the intersection root with `rootMargin: 600px 0px`
- **THEN** `onPageNearViewport` SHALL be called with `2`

#### Scenario: Distant slot does not trigger callback

- **WHEN** only slot 1 is within the prefetch margin
- **THEN** `onPageNearViewport` SHALL NOT be called for slot 5

### Requirement: Visible page reporting by intersection ratio

The hook SHALL track intersection ratios for visible slots and call `onVisiblePageChange(pageNum)` with the 1-based index that has the highest ratio among intersecting slots.

#### Scenario: Dominant visible page reported

- **WHEN** slot 3 has intersection ratio 0.8 and slot 2 has ratio 0.2
- **THEN** `onVisiblePageChange` SHALL be called with `3`

### Requirement: Programmatic scroll guard

When the `page` prop changes, the hook SHALL scroll the matching `[data-page-num]` slot into view with `scrollIntoView({ behavior: "smooth", block: "start" })` and SHALL set a guard that suppresses `onVisiblePageChange` for `PROGRAMMATIC_SCROLL_GUARD_MS` (800ms).

#### Scenario: Chrome page input scrolls slot

- **WHEN** `page` changes from 1 to 4
- **THEN** the hook SHALL scroll the slot with `data-page-num="4"` into view

#### Scenario: Guard suppresses echo callback

- **WHEN** `page` was set programmatically and scroll animation is in progress
- **THEN** `onVisiblePageChange` SHALL NOT fire until the guard elapses

### Requirement: Scroll-driven page echo suppression

When `onVisiblePageChange` fires from user scroll, the hook SHALL set an internal flag so the next `page` prop echo does not trigger a redundant `scrollIntoView`.

#### Scenario: User scroll does not fight chrome

- **WHEN** the user scrolls and `onVisiblePageChange` reports page 2
- **AND** the parent updates `page` to 2
- **THEN** the hook SHALL NOT call `scrollIntoView` for that echo update

### Requirement: layoutKey rebinds observers

When `layoutKey` changes (e.g. zoom), the hook SHALL disconnect and recreate observers so slot dimension changes are observed correctly.

#### Scenario: Zoom change rebinds

- **WHEN** `layoutKey` changes from 100 to 150
- **THEN** observers SHALL be disconnected and re-attached to current `[data-page-num]` elements

### Requirement: Callback ref stability

The hook SHALL store `onPageNearViewport` and `onVisiblePageChange` in refs updated each render so observer effects do not re-run solely because callback identity changed.

#### Scenario: Stable observer effect deps

- **WHEN** the parent passes a new `onPageNearViewport` function reference without changing `numPages` or `layoutKey`
- **THEN** the observer setup effect SHALL NOT require that function in its dependency array

