## Why

Citation hosts call `setPage(N)` on mount, but seeded `pageCount=1` clamps early jumps to page 1, and geometry-retry scroll leaves the IO guard off so visible-page reporting snaps chrome back to 1. Hosts paper over with re-apply loops; package should own readiness so a single early `setPage` lands reliably.

## What Changes

- Seed paginated `pageCount` at **0** (PDF / PPTX / multi-page TIFF); do not clamp `setPage` against unknown count.
- Queue latest pending page until real `numPages` is known, then apply once.
- Hold programmatic-scroll IO guard while scroll geometry is missing / retrying, through scroll + settle.
- Every `setPage` bumps a nav intent so same-page re-jumps still scroll (nav-token / re-cite).
- Expose sync `geometryReady: boolean` on pdf / pptx / image page chrome objects (no readiness subscribe).
- `subscribePageNavigate` unchanged (settle only).

## Capabilities

### New Capabilities

<!-- none — behavior extends existing paginated nav -->

### Modified Capabilities

- `paginated-scroll-stack`: Guard IO during geometry wait; intent-driven re-nav when page unchanged.
- `page-navigate-settled`: Pending early `setPage` still settles once geometry ready; same-page re-`setPage` settles again.
- `pdf-renderer`: `pageCount` seed / pending apply; `geometryReady` on chrome.
- `pptx-renderer`: Same page-count / pending / `geometryReady` semantics.
- `image-renderer`: Multi-page TIFF same page-count / pending / `geometryReady` semantics.

## Impact

- `FileViewer` page state + chrome API factory (`packages/file-viewer/src/FileViewer.tsx`, `types.ts`)
- `usePaginatedScrollStack`, PDF/PPTX/TIFF renderers
- README chrome notes; demo `initialPage` may simplify later (not required)
- Citation hosts (e.g. web-console) can drop re-apply loops after upgrade
- **BREAKING** (behavioral): `pageCount` starts at `0` until document reports pages — hosts that treat `1` as “ready” must use `pageCount > 0` / `geometryReady`
