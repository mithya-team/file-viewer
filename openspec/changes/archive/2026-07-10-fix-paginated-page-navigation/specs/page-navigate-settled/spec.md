## ADDED Requirements

### Requirement: subscribePageNavigate on paginated chrome APIs

When `api.file.kind` is `"pdf"`, `"pptx"`, or `"image"` with page navigation, the corresponding chrome page object (`pdf` / `pptx` / `image`) SHALL expose `subscribePageNavigate(listener): () => void`. The listener SHALL receive `{ page: number; reason: "programmatic" }` after a programmatic page navigation has applied scroll and finished smooth scrolling (or completed an instant no-op when already at target). User-scroll visible-page updates SHALL NOT invoke these listeners. Unsubscribe SHALL remove the listener.

#### Scenario: Citation host awaits settle without DOM poll

- **WHEN** a consumer calls `api.pdf.setPage(15)` then previously registered `subscribePageNavigate`
- **AND** page 15 geometry is available and smooth scroll completes
- **THEN** the listener SHALL be invoked with `{ page: 15, reason: "programmatic" }`

#### Scenario: User scroll does not fire settle listener

- **WHEN** the user scrolls so visible page changes and chrome `page` updates via `onVisiblePageChange`
- **THEN** `subscribePageNavigate` listeners SHALL NOT be invoked

#### Scenario: Unsubscribe stops further events

- **WHEN** a consumer calls the function returned by `subscribePageNavigate`
- **THEN** subsequent programmatic navigations SHALL NOT invoke that listener

### Requirement: Stale navigation does not settle older targets

When multiple programmatic `setPage` calls occur before a prior smooth scroll finishes, only the latest navigation SHALL emit a settle event for its target page.

#### Scenario: Rapid setPage keeps latest settle

- **WHEN** the consumer calls `setPage(3)` then `setPage(10)` before settle for 3
- **THEN** listeners SHALL receive a programmatic settle for page `10`
- **AND** SHALL NOT receive a settle for page `3` after the superseded navigation
