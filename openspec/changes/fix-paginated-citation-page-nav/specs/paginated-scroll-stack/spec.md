## MODIFIED Requirements

### Requirement: Programmatic scroll guard

When a programmatic navigation targets a page whose scroll offset differs from the current `scrollTop` by more than a small epsilon, the stack SHALL compute the target offset from known page/slot geometry and scroll with `behavior: "smooth"` (via `scrollTo` or equivalent). It SHALL suppress `onVisiblePageChange` from the moment programmatic navigation begins — including while `getPageScrollTop` returns null and geometry is retried — until `scrollend` on the scroll root, or until `PROGRAMMATIC_SCROLL_GUARD_MS` (800ms) elapses after scroll starts if `scrollend` is unavailable, or until an ε no-op settle when already at target. When the offset is already within epsilon and no new nav intent applies, the stack SHALL NOT start a new scroll animation.

#### Scenario: Chrome page input scrolls slot

- **WHEN** `page` changes from 1 to 4 and geometry for intervening pages is known
- **THEN** the scroll root SHALL smooth-scroll so page 4 aligns at the start of the viewport

#### Scenario: Guard suppresses echo callback

- **WHEN** `page` was set programmatically and smooth scroll is in progress
- **THEN** `onVisiblePageChange` SHALL NOT fire until the guard clears

#### Scenario: Guard active while geometry missing

- **WHEN** `page` changes to 10 and `getPageScrollTop(10)` returns null
- **THEN** the stack SHALL keep the programmatic guard active while retrying
- **AND** `onVisiblePageChange` SHALL NOT update the parent page until the guard clears

#### Scenario: Echo page prop does not re-animate

- **WHEN** user scroll reports page 2 and the parent sets `page` to 2 while already at that offset without a new nav intent
- **THEN** the stack SHALL NOT start a new smooth scroll

## ADDED Requirements

### Requirement: Nav intent re-runs programmatic scroll

The stack SHALL accept a nav intent identifier (or equivalent) from the parent. When intent changes, the stack SHALL attempt programmatic scroll to the current `page` even if `page` is unchanged, so same-page re-jumps realign to the page top.

#### Scenario: Same page re-jump scrolls again

- **WHEN** `page` is already `7` and scroll is at page 7
- **AND** nav intent increments while `page` remains `7`
- **THEN** the stack SHALL run programmatic navigation for page `7` again (ε no-op settle if already aligned, or scroll if offset drifted)
