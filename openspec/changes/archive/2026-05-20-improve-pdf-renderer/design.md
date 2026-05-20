## Context

`PdfRenderer` loads one `pdfjs-dist` document per `blob`, then renders exactly one `page` on a single canvas at `zoom`. `FileViewer` owns `pdfPage`, `pdfZoom`, and wires prev/next/setPage to chrome.

**Reference (read-only):** `sample-renderers/PdfRenderer.tsx` plus its helpers (`pdfTextLayerWordSpans`, `pdfSearchScan`, `searchHighlightColors`, `fileViewerSearchTypes`) in the host app. Do not import from `sample-renderers/`; port patterns into `packages/file-viewer/src/renderers/pdf/`.

Constraints: package-owned module worker, Tailwind + CSS variables (no new `.css` files in package), renderers internal, existing validation/error contracts preserved.

## Goals / Non-Goals

**Goals:**

- Match sample UX: continuous scroll, lazy paint, scroll↔page sync, global zoom, page chrome, text selection, search highlights.
- **Line-level text layer by default; word-level spans only while `searchQuery` is non-empty.**
- Implementation reference section below so `/opsx:apply` can follow without re-reading sample.

**Non-Goals:**

- Full search field in default chrome (renderer + props only).
- Horizontal spread, thumbnails, annotations.
- Progressive PDF load.

---

## Reference map: `sample-renderers/PdfRenderer.tsx`

Use this table during implementation. Line numbers refer to the sample file at proposal time.

| Area | Sample behavior | Package target |
|------|-----------------|----------------|
| **Scroll container** | `scrollRef`, `h-full min-h-0 flex-1 overflow-auto bg-transparent` (L555–557) | Outermost renderer root; fills `FileViewer` content area |
| **Page column** | `flex flex-col`, `gap: PAGE_GAP` (12px) (L559–561) | Same; gap via `style` or `--file-viewer-page-gap` (default 12) |
| **Page slot** | `[data-page-num]`, `relative mx-auto shrink-0`, sized `w/h = unscaled * scale` (L569–576) | One wrapper per page; inline `width`/`height` from precomputed `pageSizes` × `zoom/100` |
| **Page background** | `bg-white shadow-md` on slot (L576) | `bg-(--file-viewer-surface)` + shadow token (sample: white card on transparent scroll) |
| **Canvas** | `absolute inset-0 z-0 pointer-events-none` (L579–584) | Bitmap carries true page colors; no pointer events |
| **Text layer container** | `textLayer absolute inset-0 z-10 pointer-events-auto` (L586–591) | Selection/hits on text layer; `--scale-factor` set before render (L194) |
| **Lazy render** | `IntersectionObserver`, `rootMargin: 600px 0` (L371–382, `OBSERVER_MARGIN`) | Same constant; call `renderPage(n)` on intersect |
| **Visible page** | Second observer, `threshold` [0,0.25,0.5,0.75,1], max `intersectionRatio` → `onVisiblePageChange` (L386–409) | Skip callback when `programmaticScrollRef` true |
| **Programmatic scroll** | `page` prop → `scrollIntoView({ smooth, block: 'start' })`, guard 800ms (L431–453) | Parent `setPage` / toolbar input drives `page` prop |
| **Zoom** | `getEffectiveScale = zoom / 100`; invalidate `renderedScaleRef` + text layers on zoom change (L346–360) | `requestAnimationFrame` → `renderVisiblePages()` after zoom (L353–360) |
| **HiDPI** | `dpr` on canvas backing store + `setTransform(dpr,...)` (L244–256) | Per-page canvas (unchanged contract) |
| **Load** | `getDocument(blobUrl)`, precompute all `pageSizes` at scale 1 (L307–324) | `getDocument` from `Blob`; keep 128-byte + `%PDF` guards |
| **Loading** | Returns `null` while loading (L540–541) | Package shows `ViewerStatus` `Loading PDF...` (existing) |
| **Toolbar** | Not in sample — host chrome | `FileViewerDefaultChrome`: prev/next, page **input**, zoom +/-, zoom % (see § Toolbar) |
| **Text spans** | Sample always calls `wrapPdfTextLayerRunsWithWordSpans` (L214–216) | **Only when `searchQuery.trim()` non-empty** (see § Text layer) |
| **Search empty** | Clears matches, `clearHitStyles`, abort scan (L465–478) | Strip word spans (re-render text layer without wrap) |
| **Search active** | Debounced `scanPdfMatches`, highlights, jump page (L459–538) | Port scan + highlight; `onRequestPageForSearch` → parent `setPage` |
| **Highlight fallback** | If no word segs, highlight whole text div (line run) (L82–87) | Line-level hits when search on but spans not yet built |
| **Active match scroll** | `scrollIntoView` on `.pdf-search-hit` word seg or div (L521–537) | Same when `activeMatchIndex` changes |

### Constants (align with sample unless tokenized)

| Constant | Sample value | Notes |
|----------|--------------|-------|
| `PAGE_GAP` | `12` | px between page slots |
| `OBSERVER_MARGIN` | `600` | px vertical prefetch for lazy render |
| Programmatic scroll guard | `800` | ms — suppress `onVisiblePageChange` after `scrollIntoView` |
| Search debounce | host `FILE_VIEWER_SEARCH_DEBOUNCE_MS` | Use ~300ms in package unless shell passes delay |

### Toolbar (`FileViewer` + default chrome)

Renderer does **not** render toolbar. Shell owns navigation state:

| Control | State | API | Renderer effect |
|---------|-------|-----|-----------------|
| Prev / Next | `pdfPage`, `pdfPageCount` | `prevPage` / `nextPage` | Updates `page` → programmatic `scrollIntoView` |
| Page input | same | `setPage(n)` | Clamp 1…`pageCount`; scroll to `[data-page-num="${n}"]` |
| Zoom − / + | `pdfZoom` (e.g. 100) | `zoomOut` / `zoomIn` (+10) | `zoom` prop → invalidate renders |
| Zoom % display | `pdfZoom` | read-only label | — |
| Scroll (user) | — | — | `onVisiblePageChange` → `setPdfPage` |

`canPrev` / `canNext` from existing chrome API. Page label while scrolling comes from scroll sync, not an in-renderer label.

### Scroll ↔ page sync (sequence)

```
User scrolls
  → visibleObserver picks page with highest intersectionRatio
  → if !programmaticScrollRef: onVisiblePageChange(bestPage)
  → FileViewer setPdfPage(bestPage)
  → chrome shows updated page (no scroll loop: pageFromScrollRef pattern optional in parent)

User sets page (toolbar / prev / next)
  → FileViewer setPdfPage(n)
  → PdfRenderer page prop effect
  → programmaticScrollRef = true (800ms)
  → scrollIntoView page slot
  → suppress spurious onVisiblePageChange during animation
```

### Zoom (sequence)

```
zoom prop changes
  → renderedScaleRef.clear()
  → cancel all TextLayer instances
  → rAF: renderVisiblePages()  // pages already in view re-paint without waiting for observer re-fire
```

Effective scale: `viewport = page.getViewport({ scale: zoom / 100 })`.

### Background and layering

- **Scroll area:** transparent — shows through `FileViewer` chrome/content background.
- **Each page:** opaque surface (white in sample) + shadow — “sheet” appearance.
- **Canvas:** full-bleed under text layer; `pointer-events-none`.
- **Text layer:** transparent spans over bitmap; `pointer-events-auto` for selection.

Package: map to `--file-viewer-surface`, `--file-viewer-shadow`; avoid hardcoded `#fff` when token exists.

### Text layer: line default, word when searching

pdf.js `TextLayer` emits one `div` per text run (line-like runs). **Default (no search):**

1. Render `TextLayer`; do **not** call word-span wrapper.
2. Native selection works at run/div granularity (line-level).
3. No `PDF_WORD_SEG_CLASS` children.

**When `searchQuery.trim()` is non-empty:**

1. After `textLayer.render()`, call `wrapPdfTextLayerRunsWithWordSpans(textDivs)` (port from host `pdfTextLayerWordSpans`).
2. Each word span: `dataset.localStart` / `dataset.localEnd` for highlight geometry.
3. `applyHighlightsForPage` prefers word segs; falls back to whole div if segs missing (L82–87).

**When search cleared:**

1. Abort scan, clear matches, `clearHitStyles` on all layers.
2. Re-render text layers for visible pages **without** word wrap (or strip spans) so selection returns to line-level.

**When search toggles on:** re-run text layer pipeline for visible pages to add word spans; **off:** rebuild without spans.

Port helpers to `renderers/pdf/`:

- `pdfTextLayerWordSpans.ts` — `wrapPdfTextLayerRunsWithWordSpans`, `PDF_WORD_SEG_CLASS`
- `pdfSearchHighlights.ts` — `clearHitStyles`, `applyHighlightsForPage`, `textLayerStringRuns`
- `pdfSearchScan.ts` — `scanPdfMatches`, `charRangeToStringIndices`
- `searchHighlightColors.ts` — hit/active bg (CSS variables)

### Search props (renderer)

| Prop | Role |
|------|------|
| `searchQuery` | Trimmed; empty → line-level layers, no scan |
| `activeMatchIndex` | Highlight + scroll active hit into view |
| `onSearchStateChange` | `{ totalMatches, isSearching }` |
| `onRequestPageForSearch` | Jump when active match on another page |

`FileViewer` may omit props until search chrome exists.

### Text layer styling (no package `.css`)

Sample uses `pdf-text-layer.css` (host). Package MUST use Tailwind utilities + variables for pdf.js text layer positioning (mirror pdf.js `.textLayer` / `span` rules in tokens or a small set of classes on the container). Host apps scanning package Tailwind get correct hit targets.

### DOM tree (per page)

```
scrollRef (overflow-auto, flex-1, bg transparent)
└── column (flex-col, gap PAGE_GAP)
    └── [data-page-num=n] (relative, mx-auto, w/h scaled, bg surface, shadow)
        ├── canvas (absolute inset-0 z-0, pointer-events-none)
        └── div.textLayer (absolute inset-0 z-10, pointer-events-auto)
```

### Effects order (mirror sample)

1. **blob/url** — load doc, `pageSizes`, `onPageCountChange`, destroy on cleanup.
2. **zoom** (after load) — clear scale cache + text layers.
3. **zoom + load** — rAF `renderVisiblePages`.
4. **numPages + load** — attach both IntersectionObservers to all `[data-page-num]`.
5. **page** — programmatic `scrollIntoView` (skip if update came from scroll).
6. **searchMatches + activeMatchIndex** — `reapplyAllHighlights`.
7. **searchQuery** — debounced scan or clear.
8. **activeMatchIndex + match page** — scroll hit into view; `onRequestPageForSearch` if wrong page.

---

## Decisions

### 1. Line-level default, word-level only during search

**Choice:** Conditional `wrapPdfTextLayerRunsWithWordSpans` gated on `searchQuery.trim() !== ""`; rebuild text layer when search toggles.

**Rationale:** User requirement; line divs suffice for selection; word granularity only needed for precise search highlights.

**Note:** Sample currently always wraps words — package **intentionally diverges** here.

### 2–8. (Unchanged summaries)

- Page stack DOM per reference map.
- Dual `IntersectionObserver` for lazy render + visible page.
- `FileViewer` owns `pdfPage`; renderer reports `onVisiblePageChange`.
- Zoom invalidation + rAF visible repaint.
- Search props optional; scan/highlight in renderer.
- No in-renderer page label; chrome page input.
- Tests: mock observers, assert no word spans until search non-empty.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Rebuilding text layer on search toggle | Only visible/near pages |
| Text layer CSS without `.css` file | Document required Tailwind classes; verify in playground |
| Sample always word-wraps | Document divergence in design + spec |

## Migration Plan

1. Port `renderers/pdf/*` helpers from sample/host patterns.
2. Refactor `PdfRenderer` per reference map.
3. Wire `FileViewer` + default chrome toolbar table.
4. Tests + playground smoke.

## Open Questions

- None blocking — page gap uses `--file-viewer-page-gap` default 12px.
