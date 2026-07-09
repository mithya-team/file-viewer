## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Scroll-driven page echo suppression

**Reason:** Replaced by epsilon offset check; `pageFromScrollRef` caused programmatic `setPage` to skip scroll after user scroll.
**Migration:** Rely on geometry compare + `shouldReportVisiblePageChange` (`visiblePage !== currentPage`).
