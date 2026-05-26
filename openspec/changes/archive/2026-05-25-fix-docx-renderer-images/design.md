## Context

`DocxRenderer` delegates to `docx-preview` (`renderAsync`) with default options. The library converts OOXML to semantic HTML but mishandles **anchored drawings** with `wp:wrapNone`:

- Sets wrapper `width`/`height` to `0px` (overwriting `<wp:extent>`).
- Applies only `left`/`top` from `posOffset`; ignores `wp:align` (e.g. `right` on margin-relative anchors).
- Parses `behindDoc` but does not apply z-index/stacking.
- Injects `section.docx { overflow: hidden }`, clipping overflow from zero-size parents.

Investigation on `dataops_sample_template_v1.docx` confirmed: images load (`naturalWidth > 0`), blob/base64 `src` is fine; failure is **layout**. Header logo expects margin-right alignment; cover background is page-anchored `behindDoc="1"`.

Project constraints: keep `FileViewer` public API unchanged; DOCX path remains client-side `docx-preview`; no filename-based routing; prefer composition over forking upstream initially.

## Goals / Non-Goals

**Goals:**

- Anchored images in DOCX/DOTX output are **visible** (non-zero effective box) and **positioned** closer to Word for common template patterns (right-aligned header logo, full-page background on cover).
- Behind-document graphics render **under** main article text on the same page.
- Correction runs automatically after each successful `renderAsync` in `DocxRenderer`.
- Regression tests guard wrapper-size and alignment heuristics; demo template remains the manual QA fixture.

**Non-Goals:**

- Forking or patching `docx-preview` npm package (may revisit if post-processing is insufficient).
- Server-side Word/LibreOffice → PDF conversion.
- Perfect parity for all wrap types (`square`, `tight`, `through`, etc.) or every `relativeFrom` value.
- PPTX, custom renderer registration, progressive rendering.

## Decisions

### 1. Post-render DOM correction (not upstream fork)

**Choice:** Add `correctDocxPreviewLayout(host: HTMLElement)` called from `DocxRenderer` after `renderAsync` resolves.

**Rationale:** Upstream `parseDrawingWrapper` bugs are clear but fixing them in a fork adds maintenance. A focused pass on emitted DOM lets us ship quickly and stay on the published package.

**Alternatives:**

- **Fork `docx-preview`:** Correct fix location, higher long-term cost.
- **Replace renderer:** High fidelity but violates v1 scope/cost.

### 2. Heuristic targeting of broken wrappers

**Choice:** Find drawing wrapper `div`s inside `.docx` output where computed or inline size is `0px` (width and/or height) and that contain an `img` child with non-zero `naturalWidth`/`naturalHeight`.

**Rationale:** Matches the failure mode without parsing OOXML again.

**Alternatives:**

- Re-parse DOCX ZIP for anchor metadata — more accurate, duplicates work and couples to OOXML.

### 3. Layout rules applied per wrapper

**Choice:** For each matched wrapper:

| Issue | Correction |
|--------|------------|
| 0×0 box | Set wrapper dimensions from child `img` offsetWidth/Height or inline img styles; set `overflow: visible` on wrapper |
| Right-floated appearance | If wrapper has `left: 0` / no `right` and img is in `header` or first `section`, detect sibling/header context: apply `position: absolute; right: 0` within positioned header/section (set `position: relative` on header/section if needed) |
| Page background (large img, first section) | `position: absolute; inset: 0; width: 100%; height: 100%; object-fit` or explicit page size from section; `z-index: 0` |
| Behind text | Set wrapper/image `z-index: 0`; ensure `article` content stays above (`z-index: 1` or leave library default) |
| Clipping | On first page `section.docx` only, set `overflow: visible` when a full-page background layer is detected |

**Rationale:** Addresses confirmed bugs on the sample template; rules are incremental.

**Alternatives:**

- Global `overflow: visible` on all sections — may break intentional clipping on other docs.

### 4. Dedicated style container

**Choice:** Pass a sibling element as `styleContainer` to `renderAsync` (styles in one node, body in host) per library recommendation.

**Rationale:** Avoids style/body collisions; minor structural improvement alongside layout fix.

### 5. Testing strategy

**Choice:**

- **Unit tests** for `correctDocxPreviewLayout` with synthetic DOM fixtures (0px wrapper + img, header right-align case).
- **Integration test** (jsdom/happy-dom if available, else document fixture + manual checklist in tasks) loading minimal HTML mimicking docx-preview output.

**Rationale:** Full DOCX render in CI may need DOM; synthetic tests keep feedback fast.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Heuristics mis-position images in unusual DOCX | Scope rules to detected patterns; add tests; document limitations in spec non-goals |
| `overflow: visible` on cover page affects pagination | Limit to sections with detected full-page background child |
| Absolute positioning breaks on narrow viewports | Keep section `position: relative`; use % where possible |
| Library DOM class names change | Target structural heuristics (0px + img), not private class names |
| Double correction on re-render | Run only once per `renderAsync` completion; `replaceChildren` clears prior DOM |

## Migration Plan

- Library patch release only; no consumer API changes.
- Rollback: remove correction call and helper module.
- Verify demo `docx` fixture visually after deploy.

## Open Questions

- Should right-align detection use **header-only** scope initially to reduce false positives on body anchors?
- Do we need `useBase64URL: true` for any embed environments, or keep default blob URLs?
