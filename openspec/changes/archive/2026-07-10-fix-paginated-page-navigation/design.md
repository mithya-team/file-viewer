## Context

PDF/TIFF keep a bidirectional `page` channel with `pageFromScrollRef` (skip scroll on IO echo) and `programmaticScrollRef` (suppress IO during nav). After user scroll, IO often sets the echo flag even when the visible page is unchanged, so later `setPage(n)` updates chrome but skips scroll. PPTX already uses `usePaginatedScrollStack` + geometry `scrollTop` without the echo flag. Citation hosts poll DOM for slot height because `setPage` is fire-and-forget.

## Goals / Non-Goals

**Goals:**

- PDF/TIFF/PPTX share one scroll-stack model: no `pageFromScrollRef`; ε-check skips redundant scroll.
- Programmatic nav uses smooth `scrollTo` after geometry is known.
- `subscribePageNavigate` on `pdf` / `image` / `pptx` chrome APIs fires on programmatic settle only.
- Hosts can drop layout-readiness polls for citation jumps.

**Non-Goals:**

- Shared top-level `api.navigateToPage`
- Canvas `max-w-none` theme decoupling
- Chrome render-prop / children API
- Waiting for canvas/SVG paint as part of settle

## Decisions

### 1. Delete `pageFromScrollRef`; keep programmatic IO guard

Echo = already within ε of target offset → no-op scroll. IO→state only when `visiblePage !== currentPage` and not in programmatic guard (PPTX `shouldReportVisiblePageChange` already).

**Alt:** Clear flag on API `setPage` only — still fragile if IO races.

### 2. Smooth `scrollTo({ top, behavior: "smooth" })` after geometry

Compute target Y from page sizes (PDF/TIFF) or slide cache (PPTX). Do not start smooth until sizes for pages before `n` exist (or use placeholder heights consistently like PPTX). Prefer `scrollend` to clear programmatic guard; fallback `PROGRAMMATIC_SCROLL_GUARD_MS`.

**Alt:** Instant-only — rejected; product wants animation.

### 3. Settle = scroll applied + animation finished (not paint)

Emit `{ page, reason: "programmatic" }` after smooth completes (or instant assign). Stale nav: generation id; only latest settles.

### 4. `subscribePageNavigate(listener): () => void` on chrome page objects

Sync `setPage` stays; listener replaces host poll. Optional later: Promise-returning `setPage` — not required this change.

**Alt:** FileViewer prop callback — worse for chrome-held citation context.

### 5. Wire settle from renderers up through FileViewer chrome factory

Renderers call `onProgrammaticPageNavigateSettled?.(page)` (internal). FileViewer holds Set of listeners per kind and exposes subscribe on chrome API.

## Risks / Trade-offs

- [Smooth + late size growth] → Gate on known sizes; one corrective scroll on settle if drift > ε
- [scrollend unsupported] → timeout fallback
- [Listener identity / remount] → subscribe on chrome api object; document stable chrome component type (README note only)
- [Spec vs PPTX impl drift] → Update `paginated-scroll-stack` to match geometry+smooth, remove echo-flag requirement

## Migration Plan

Additive API (`subscribePageNavigate`). Behavior fix for `setPage` scroll. No breaking type removals. Hosts can remove DOM polls after upgrading.

## Open Questions

None blocking — programmatic-only events and sync `setPage` + subscribe confirmed.
