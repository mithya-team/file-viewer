## Context

`PdfRenderer` tracks loaded document in `pdfDocument` state (null until `getDocument` resolves). Loading UI is gated on `pageCount === 0`, but `FileViewer` never passes 0—initial and reset value is `1`. The loading branch is dead code.

## Goals / Non-Goals

**Goals:**

- Show `Loading PDF...` while the PDF document is not yet available for the current blob.
- Remove reliance on `pageCount === 0` for loading detection.
- Add a unit test that proves loading UI renders before load completes.

**Non-Goals:**

- Changing `FileViewer` chrome `pageCount` semantics (stay `1` until `onPageCountChange`).
- Redesigning global `FileViewer` loading state (file-level loading remains separate).
- Progressive/streaming PDF render.

## Decisions

### 1. Gate loading UI on `pdfDocument === null`

**Choice:** Replace `pageCount === 0` with `pdfDocument == null` for `ViewerStatus`.

**Rationale:** Matches actual load state inside `PdfRenderer`; no parent coordination; works on blob change (state resets to null before reload).

**Alternative:** Initialize `pdfPageCount` to `0` in `FileViewer` — fixes the branch but misuses page count for chrome (`Page 1 / 0`, disabled nav edge cases).

### 2. Hide page label until document is loaded

**Choice:** Render `Page {page} / {pageCount}` only when `pdfDocument != null`.

**Rationale:** Avoids misleading `Page 1 / 1` on an empty canvas during load.

**Alternative:** Always show page label — simpler but worse UX.

### 3. Keep `pageCount` prop unchanged

**Choice:** No API change; `pageCount` remains parent-driven for display after load.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Brief flash of loading on blob swap | Expected; same as today’s blank canvas, now labeled |
| Test timing for async load | Delay `getDocument` promise in test until assertion |

## Migration Plan

N/A — behavior-only fix in patch release.

## Open Questions

None.
