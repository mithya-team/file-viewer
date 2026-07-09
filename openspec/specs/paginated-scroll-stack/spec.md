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

When the `page` prop changes to a target whose scroll offset differs from the current `scrollTop` by more than a small epsilon, the stack SHALL compute the target offset from known page/slot geometry and scroll with `behavior: "smooth"` (via `scrollTo` or equivalent). It SHALL suppress `onVisiblePageChange` until `scrollend` on the scroll root, or until `PROGRAMMATIC_SCROLL_GUARD_MS` (800ms) elapses if `scrollend` is unavailable. When the offset is already within epsilon, the stack SHALL NOT start a new scroll animation.

#### Scenario: Chrome page input scrolls slot

- **WHEN** `page` changes from 1 to 4 and geometry for intervening pages is known
- **THEN** the scroll root SHALL smooth-scroll so page 4 aligns at the start of the viewport

#### Scenario: Guard suppresses echo callback

- **WHEN** `page` was set programmatically and smooth scroll is in progress
- **THEN** `onVisiblePageChange` SHALL NOT fire until the guard clears

#### Scenario: Echo page prop does not re-animate

- **WHEN** user scroll reports page 2 and the parent sets `page` to 2 while already at that offset
- **THEN** the stack SHALL NOT start a new smooth scroll

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

