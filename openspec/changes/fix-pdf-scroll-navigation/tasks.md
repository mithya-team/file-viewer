## 1. PDF Navigation Lifecycle

- [x] 1.1 Queue the latest PDF page intent until EmbedPDF reports its scroll layout ready, then dispatch and settle it once.
- [x] 1.2 Prevent programmatic EmbedPDF page events from overwriting user-visible page state during pending navigation.
- [x] 1.3 Synchronize zoom only for a document or requested zoom change, not for fresh scoped capability wrappers.
- [x] 1.4 Release the default zoom gate after the viewport is measurable and defer requested zoom changes while scrolling is active.

## 2. Regression Coverage

- [x] 2.1 Cover pre-layout navigation, latest-request-wins, and programmatic page-event suppression in the PDF adapter tests.
- [x] 2.2 Cover stable zoom synchronization when a page update supplies fresh scoped controls.
- [x] 2.3 Cover gate release, idle-scroll zoom application, and no redundant initial scale transaction.

## 3. Verification

- [x] 3.1 Run focused PDF and FileViewer tests plus package typecheck/build verification.
