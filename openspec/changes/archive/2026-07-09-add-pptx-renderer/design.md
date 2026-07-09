## Context

`detectFileKind` sniffs OpenXML zip payloads for `xl/` (spreadsheet) and `word/` (docx/dotx) but treats `ppt/` presentations as **unsupported**. `FileViewer` has no renderer branch for presentations. Docs and `docs/decisions.md` already commit to **[Pagus](https://github.com/pagus-kit/Pagus)** (`@pagus-kit/core@0.1.1`, `@pagus-kit/renderer@0.1.1`) as the post-v1 engine, validated by `scripts/pptx-spike/` on `sample-files/*.pptx`.

`PdfRenderer` and `TiffRenderer` duplicate ~90 lines of scroll orchestration (dual `IntersectionObserver`, visible-page reporting, programmatic scroll guard). A third copy in `PptxRenderer` would worsen drift.

Pagus is pure JS (fast-xml-parser + jszip + SVG string generation). Spike and Node verification confirm **static imports and `parse()` are SSR-safe**; rendered SVG embeds images as `data:` URIs (no blob URL cleanup). Parse runs on the main thread (~100ms for a 300KB / 16-slide deck in spike).

## Goals / Non-Goals

**Goals:**

- Content-driven `pptx` detection (magic `ppt/` + presentation MIME; POTX template MIME on same path).
- Internal `PptxRenderer`: `pagusParse` once per blob → lazy `renderSlide` → SVG in vertical scroll stack.
- Package-owned chrome: `PptxChromeApi` with PDF-like page nav + zoom (40–300%).
- Shared `usePaginatedScrollStack` hook — first consumer `PptxRenderer`; Pdf/Tiff migration deferred.
- Zoom at 100% = native Pagus output pixel dimensions (PDF-like); scale via slot width/height, not re-render.
- Download uses original buffered PPTX blob URL.
- Static preview only.

**Non-Goals:**

- `@pagus-kit/react`, PPT (OLE), animations, presenter mode, editing.
- Pdf/Tiff hook migration in this change.
- Worker offload for Pagus parse.
- Custom renderer registration.

## Decisions

### 1. Pagus packages pinned at 0.1.1

**Choice:** Add `@pagus-kit/core@0.1.1` and `@pagus-kit/renderer@0.1.1` as direct dependencies.

**Rationale:** Documented in `docs/decisions.md` and `docs/invariants.md`; spike validated this version.

**Alternatives:** pptx-glimpse — rejected in spike (slower, larger SVGs).

### 2. New public `FileKind: "pptx"` (not folded into another kind)

**Choice:** Extend `FileKind` and `DetectionResult` with `pptx`; route to dedicated renderer and `PptxChromeApi`.

**Rationale:** Distinct chrome surface; avoids overloading PDF or image APIs. `FileViewer` props unchanged.

### 3. POTX via pptx path

**Choice:** `application/vnd.openxmlformats-officedocument.presentationml.template` and `ppt/` zip sniff route to `pptx` (mirror dotx→docx).

### 4. Static top-level Pagus imports

**Choice:** `import { parse } from "@pagus-kit/core"` and `import { renderSlide, buildFontSubstitutes } from "@pagus-kit/renderer"` at module top in `PptxRenderer.tsx`.

**Rationale:** Node/SSR verification shows no browser globals at import time. Parse/render execute in `useEffect` only.

**Alternatives:** Dynamic `import()` — optional bundle-splitting later, not required for SSR.

### 5. SVG mount via DOMParser append

**Choice:** Parse Pagus `renderSlide` SVG strings with `DOMParser` and append the resulting `SVGElement` to a wrapper `div`. Apply Tailwind `[&_svg]:w-full [&_svg]:h-full` on the wrapper to override baked width/height attributes.

**Rationale:** Pagus uses `foreignObject` HTML for text; `<img>` cannot render it. Pagus output is parser-generated from the uploaded blob, not arbitrary host HTML.

### 6. Lazy slide render + session SVG cache

**Choice:**

- Parse eagerly once: `blob.arrayBuffer()` → `pagusParse` → `buildFontSubstitutes(presentation.fonts)`.
- `renderSlide` on viewport intersection (prefetch margin `OBSERVER_MARGIN` = 600px).
- Cache `Map<pageNum, { svg, width, height }>` for session; clear on blob change; no LRU cap in v1.

**Rationale:** Matches TIFF lazy decode pattern; spike shows per-slide render is cheap but full-deck upfront blocks main thread on large decks.

### 7. Zoom via slot dimensions (no re-render)

**Choice:** `scale = zoom / 100`; slot `width`/`height` = `rendered.width * scale` / `rendered.height * scale`. Do not call `renderSlide` again on zoom change.

**Rationale:** Pagus `RenderOptions.scale` exists but CSS layout reuse is cheaper and matches exploration decision (PDF-like sizing at 100%).

### 8. `usePaginatedScrollStack` extracted for Pptx only (Option A)

**Choice:** New hook in `src/renderers/usePaginatedScrollStack.ts` encapsulating dual observers, visible-page callback, programmatic scroll guard. `PptxRenderer` is first adopter; Pdf/Tiff stay as-is until follow-up.

**Rationale:** Minimize PPTX PR scope; prove hook API before migrating two stable renderers.

**Hook API:**

```ts
usePaginatedScrollStack({
  numPages,
  isDocumentLoading,
  page,
  onVisiblePageChange?,
  onPageNearViewport,
  layoutKey?, // pass zoom for Pptx/Pdf slot resize re-bind
}) → { scrollRef }
```

Callbacks stored in refs to avoid observer churn.

### 9. Shell state: `pptxPage`, `pptxPageCount`, `pptxZoom`

**Choice:** Separate state from PDF/image; reset on `source` change; clamp page when count changes; PDF zoom bounds (40–300).

**Rationale:** Avoid cross-format state bleed when switching sources in demo/host apps.

### 10. Default chrome mirrors PDF controls

**Choice:** Prev / `PdfPageInput` / next / zoom −/+ for `api.file.kind === "pptx"`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Pagus bundle size in `dist/index.js` | Measure after build; document in README if significant |
| Large decks × data-URI images in SVG | Session cache grows; lazy render bounds initial work; revisit if OOM reported |
| `foreignObject` font fallback | `buildFontSubstitutes`; spike showed good fidelity on sample decks |
| Main-thread parse jank | Acceptable per spike; parse once in effect with loading UI |
| Unsupported PPTX features (charts, SmartArt gaps) | Render errors per slot or global parse failure; static preview scope |
| Hook API mismatch when migrating Pdf/Tiff | Design hook from shared Pdf/Tiff behavior; migrate in follow-up change |

## Migration Plan

- Additive: new `FileKind` variant, new chrome API, new dependencies.
- Custom chrome consumers: `api.file.kind === "pptx"` narrows to `PptxChromeApi`; no breaking changes to `FileViewerProps`.
- Update `docs/invariants.md` to remove "must not implement PPTX in v1".
- Demo: add `sample-4.pptx` or similar under `apps/demo/public/sample-files`.

## Open Questions

- Which demo fixture(s) to ship (sample-4, sample-5, Wayground deck — size vs coverage).
- Follow-up change name for Pdf/Tiff `usePaginatedScrollStack` migration.
