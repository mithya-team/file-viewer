## 1. Reference helpers (port from sample / host patterns)

- [x] 1.1 Add `renderers/pdf/pdfTextLayerWordSpans.ts` — `wrapPdfTextLayerRunsWithWordSpans`, `PDF_WORD_SEG_CLASS` (only invoked when search non-empty)
- [x] 1.2 Add `renderers/pdf/pdfSearchHighlights.ts` — `clearHitStyles`, `applyHighlightsForPage`, line-div fallback when no word segs
- [x] 1.3 Add `renderers/pdf/pdfSearchScan.ts` + debounce constant — `scanPdfMatches`, `charRangeToStringIndices`
- [x] 1.4 Add highlight color tokens / `searchHighlightColors` via CSS variables
- [x] 1.5 Document Tailwind/text-layer classes needed (pdf.js `textLayer` positioning) — no package `.css` file

## 2. PdfRenderer structure (per `design.md` reference map)

- [x] 2.1 Scroll root: `overflow-auto`, transparent bg, `flex-1 min-h-0`
- [x] 2.2 Page column: `flex-col`, gap `PAGE_GAP` (12px / `--file-viewer-page-gap`)
- [x] 2.3 Page slots: `[data-page-num]`, scaled `width`/`height` from `pageSizes × zoom/100`, surface bg + shadow, `relative mx-auto`
- [x] 2.4 Canvas: `absolute inset-0 z-0 pointer-events-none`; text layer container `absolute inset-0 z-10 pointer-events-auto`
- [x] 2.5 Document load: validation, load-once, precompute `pageSizes` at scale 1, `onPageCountChange`

## 3. Lazy render, zoom, scroll↔page

- [x] 3.1 `IntersectionObserver` lazy render (`OBSERVER_MARGIN` 600px) → `renderPage`
- [x] 3.2 Visible-page observer (intersection ratios) → `onVisiblePageChange`; `programmaticScrollRef` 800ms guard
- [x] 3.3 `page` prop → `scrollIntoView({ smooth, block: 'start' })`; skip loop when scroll-driven update
- [x] 3.4 Zoom: invalidate `renderedScaleRef`, cancel text layers, rAF `renderVisiblePages`
- [x] 3.5 HiDPI per-page canvas (existing contract)

## 4. Text layer: line default, word when searching

- [x] 4.1 `renderTextLayerForPage`: set `--scale-factor`, `TextLayer.render()`; **no word wrap** when `searchQuery` empty
- [x] 4.2 When `searchQuery` non-empty: call word-span wrap after render; `applyHighlightsForPage`
- [x] 4.3 On search clear: abort scan, clear highlights, rebuild visible text layers without word spans
- [x] 4.4 On search toggle: re-render text layers for visible pages to add/remove spans
- [x] 4.5 Active match: `onRequestPageForSearch`, scroll hit (`word seg` or div) into view

## 5. FileViewer toolbar integration

- [x] 5.1 `onVisiblePageChange` → `setPdfPage` in `FileViewer`
- [x] 5.2 Default chrome: page number input + prev/next + zoom (per design toolbar table)
- [x] 5.3 Optional search props on `PdfRenderer`; wire when shell ready
- [x] 5.4 Remove in-renderer `Page X / Y` label

## 6. Tests and verification

- [x] 6.1 Tests: no word-span children when `searchQuery` empty; spans present when non-empty
- [x] 6.2 Tests: observers, lazy `getPage`, zoom invalidation, visible page callback, scroll guard
- [x] 6.3 Tests: page sheet classes/tokens, transparent scroll root
- [x] 6.4 Playground smoke: scroll, toolbar page jump, zoom, selection, search on/off span mode
