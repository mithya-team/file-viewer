## ADDED Requirements

### Requirement: Early setPage settles after geometry ready

When a consumer calls `setPage(N)` before page count or scroll geometry is ready, the package SHALL retain the latest target and, once count and geometry allow scroll, complete programmatic navigation and invoke `subscribePageNavigate` with `{ page: N, reason: "programmatic" }` (clamped to valid range when count is known).

#### Scenario: Citation setPage before geometry

- **WHEN** a consumer calls `api.pdf.setPage(15)` while `pageCount` is still `0` or geometry is not ready
- **AND** the document later reports at least 15 pages and geometry becomes ready
- **THEN** listeners SHALL be invoked with `{ page: 15, reason: "programmatic" }` after scroll settles

### Requirement: Same-page setPage settles again

When a consumer calls `setPage(N)` while chrome `page` is already `N`, the package SHALL treat that as a new programmatic navigation (nav intent) and SHALL invoke settle listeners again after that navigation completes (including ε no-op when already aligned).

#### Scenario: Re-cite same page fires settle

- **WHEN** chrome `page` is `15` and the viewport is on page 15
- **AND** the consumer calls `setPage(15)` again
- **THEN** `subscribePageNavigate` listeners SHALL be invoked again with `{ page: 15, reason: "programmatic" }` after the navigation settles
