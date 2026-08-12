## MODIFIED Requirements

### Requirement: Stale navigation does not settle older targets

When multiple programmatic `setPage` calls occur before a prior smooth scroll finishes, including calls made before the PDF layout is ready, only the latest navigation SHALL be dispatched and emit a settle event for its target. A user-scroll visible-page update SHALL not emit a settle event.

#### Scenario: Rapid setPage keeps latest settle

- **WHEN** the consumer calls `setPage(3)` then `setPage(10)` before page layout is ready or before settle for 3
- **THEN** listeners SHALL receive a programmatic settle for page `10`
- **AND** SHALL NOT receive a settle for page `3` after the superseded navigation

#### Scenario: Same-page re-jump settles again

- **WHEN** the consumer calls `setPage(10)` after a prior navigation to page 10 has settled
- **THEN** the new navigation intent SHALL be dispatched
- **THEN** listeners SHALL receive a new programmatic settle for page `10`
