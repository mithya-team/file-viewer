## Context

Citation hosts call `api.*.setPage(N)` as soon as chrome mounts. Today `FileViewer` seeds `pdfPageCount` / `imagePageCount` / `pptxPageCount` at `1` and clamps via `setPageWithinBounds(page, pageCount)` with `Math.max(pageCount, 1)`, so early `setPage(N)` becomes page 1. Independently, `usePaginatedScrollStack` retries when `getPageScrollTop` returns null but does not set `programmaticScrollRef` during that wait, so IntersectionObserver can overwrite chrome to page 1. Prior change `fix-paginated-page-navigation` added settle + geometry scroll but left these gaps.

## Goals / Non-Goals

**Goals:**

- Early `setPage(N)` before `numPages` / geometry is known lands on N without host re-apply loops.
- Shared behavior for PDF, PPTX, multi-page TIFF.
- IO cannot overwrite target while geometry is missing or programmatic scroll is in flight.
- Same-page `setPage(N)` re-triggers scroll (nav token / re-cite).
- Sync `geometryReady` on chrome page objects.

**Non-Goals:**

- Readiness subscribe API
- `initialPage` prop on `FileViewer`
- Placeholder heights for PDF (keep null-until-known + retry)
- Passage/Y-offset within page (page-level only)
- Changing `subscribePageNavigate` semantics beyond pending/same-N settle

## Decisions

### 1. Seed `pageCount` at 0; pending page until count known

Store `pendingPage: number | null` (or equivalent) in `FileViewer`. `setPage(n)` when `pageCount === 0` stores pending (latest wins) and does not clamp to 1. When renderer reports real count, apply `min(max(pending ?? current, 1), pageCount)` once and clear pending. Source change resets count to 0, page to 1, pending null.

**Alt:** Hosts wait for `pageCount > 1` — rejected; 1-page docs and race windows remain.

### 2. `geometryReady` sync boolean only

Renderers report geometry readiness (PDF/TIFF: all page sizes known; PPTX: slide geometry available for scroll tops). `FileViewer` exposes `geometryReady` on `pdf` / `pptx` / `image` chrome objects. No subscribe.

**Alt:** subscribeReady with replay — rejected per product choice.

### 3. Hold programmatic guard for entire nav lifecycle

In `usePaginatedScrollStack`, set `programmaticScrollRef` as soon as a programmatic nav starts — including when `getPageScrollTop` returns null and during geometry retries — until settle (scrollend / timeout / ε no-op).

### 4. Nav intent id for same-page re-jump

Every chrome `setPage` increments `pageNavIntent` (or similar) even when page value unchanged. Pass intent into renderers / scroll stack so the page effect re-runs and re-scrolls to page top.

**Alt:** Public `setPage(n, { force })` — more API; intent is internal.

### 5. Shared FileViewer helpers for all three kinds

One clamp/pending/intent helper used by pdf, image (TIFF), pptx setters — avoid three divergent paths.

## Risks / Trade-offs

- [Hosts treat `pageCount === 1` as ready] → Document behavioral break; use `pageCount > 0` and/or `geometryReady`
- [Long geometry load keeps IO suppressed] → Guard only while pending nav generation is active; clear on settle/cancel
- [1-page PDF: count stays 0 briefly then 1] → Pending apply still works; chrome shows 0 until ready (UI should hide nav or show loading)
- [PPTX geometry definition differs from PDF sizes map] → Renderer-specific `geometryReady` predicate; chrome field shared

## Migration Plan

1. Ship package with seed 0 + pending + guard + intent + `geometryReady`.
2. Citation hosts: remove re-apply loops; call `setPage` once; optionally gate UI on `geometryReady`.
3. Rollback: revert package; hosts keep loops.

## Open Questions

None — decisions locked in explore.
