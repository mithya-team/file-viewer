## Context

`ImageRenderer` today centers a fit-contained `<img>` with no zoom state. `FileViewer` owns `pdfZoom` and exposes `api.pdf.*` for default and custom chrome; PDF toolbar uses ±10 with clamp `[40, 300]`. `sample-renderers/ImageRenderer.tsx` (reference only) implements `width: ${zoom}%`, scroll + drag-to-pan, but is not imported by the package.

`docs/invariants.md` requires zoom state to route through the package shell, not per-renderer public APIs. `ImageChromeApi` currently exposes only `file` metadata.

## Goals / Non-Goals

**Goals:**

- Shell-owned `imageZoom` (default 100), reset on `source` change.
- `ImageChromeApi.image` parallel to `api.pdf` for custom/default chrome.
- Default chrome: − / zoom % / + for images (toolbar ±10, clamp 40–200).
- `ImageRenderer`: zoom layout, pan when overflow, single-click sequential step-in, double-click reset to 100.
- Mouse zoom when `chrome="none"`.
- Testable pure functions for step and clamp logic.

**Non-Goals:**

- Wheel/pinch zoom, zoom animation presets beyond a simple width transition.
- Zoom for non-image formats.
- Exporting `ImageRenderer` as public runtime API.
- Filename-based or consumer-MIME routing changes.

## Decisions

### 1. Zoom state lives in `FileViewer` (same as PDF)

**Choice:** `imageZoom` + setters in `FileViewer`; `ImageRenderer` receives `zoom` and gesture callbacks.

**Rationale:** Matches invariants and existing `pdfZoom` pattern; custom chrome reads the same state via `api.image.*`.

**Alternatives:** Renderer-internal state — rejected (breaks chrome API and custom toolbar sync).

### 2. `ImageChromeApi.image` mirrors PDF zoom surface

**Choice:**

```ts
image: {
  zoom: number;
  zoomIn: () => void;      // +10, clamped
  zoomOut: () => void;     // -10, clamped
  setZoom: (n: number) => void;
  stepZoomIn: () => void;  // sequential click steps
  resetZoom: () => void;   // → 100
}
```

**Rationale:** Consumers narrowing `api.file.kind === "image"` get the same ergonomics as PDF; `stepZoomIn` / `resetZoom` are callable from tests or custom UI without duplicating step logic.

### 3. Toolbar vs click step sizes

| Control | Behavior |
|---------|----------|
| Toolbar `zoomIn` / `zoomOut` | ±10 percentage points, clamp `[40, 200]` |
| Single click (`stepZoomIn`) | Sequential: +50 while `<150`, +25 while `<175`, else +10; cap 200; no-op at 200 |
| Double click (`resetZoom`) | Set to 100 |
| `setZoom` | `clamp(n, 40, 200)` |

**Rationale:** User-requested click curve; toolbar aligned with PDF ±10; min 40% matches PDF floor.

### 4. Layout model from sample reference

**Choice:** Scroll root `overflow-auto`; inner flex center; `img` with `width: ${zoom}%`, `maxWidth: none`, `height: auto`; optional 120ms width transition except while dragging.

**Rationale:** Proven in reference renderer; enables pan when zoomed past viewport.

**Alternatives:** `transform: scale()` — rejected (blur, harder scroll sizing).

### 5. Pointer handling

**Choice:** Pan with pointer capture when scrollable (same pattern as sample); single-click step only if not dragging (movement threshold or pointer-up without significant move); double-click on image calls `resetZoom`.

**Rationale:** Avoid zoom step firing after pan gestures.

### 6. Module layout

**Choice:** `src/image/imageZoom.ts` (or `src/zoom/imageZoom.ts`) for `zoomAfterImageClick`, `clampImageZoom`, constants `MIN_IMAGE_ZOOM = 40`, `MAX_IMAGE_ZOOM = 200`, `DEFAULT_IMAGE_ZOOM = 100`, `IMAGE_ZOOM_TOOLBAR_STEP = 10`.

**Rationale:** Unit-testable without React; keeps `FileViewer` thin.

### 7. `ImageRendererProps` extension

**Choice:** Add `zoom: number`, `onStepZoom: () => void`, `onResetZoom: () => void` (required when renderer mounted for images).

**Rationale:** Explicit contract; type export updated for consumers wrapping internals in tests.

### 8. Render error recovery

**Choice:** Clear `renderError` when `imageZoom` changes (mirror PDF `pdfPage` / `pdfZoom` effect).

**Rationale:** Consistent retry behavior.

## Risks / Trade-offs

- **[Risk] Click vs pan ambiguity** → Mitigation: suppress step on drag; only primary button.
- **[Risk] `width: N%` baseline differs from old fit-contain** → Mitigation: default 100% tuned so first paint matches prior “fit” perception; document that 100% is baseline.
- **[Risk] `useEffect` for pannable measure** → Mitigation: prefer `ResizeObserver` on scroll container if feasible per project conventions; otherwise minimal effect like sample.
- **[Trade-off] No wheel zoom** → Hosts can add via custom chrome calling `setZoom` later.

## Migration Plan

Library release only; no data migration. **Additive** `ImageChromeApi.image` — existing code narrowing on `file` still compiles; consumers must handle new `image` branch for zoom UI.

Rollback: revert change; images return to fit-only view.

## Open Questions

None — min 40%, max 200%, click no-op at 200%, double-click reset confirmed.
