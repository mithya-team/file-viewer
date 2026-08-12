# PDF canvas 0×0 in consumer apps

## What you should see

`PdfRenderer` stacks two layers per page:

| Layer | Role | Default appearance |
|-------|------|--------------------|
| **Canvas** (`z-0`) | Painted PDF pixels (EmbedPDF/PDFium) | Visible page image |
| **Text layer** (`z-10`) | Selectable/searchable text | **Transparent** (`text-transparent` on spans) |

In `apps/demo`, both work: you see the bitmap and can still select text.

In a broken consumer, only the text layer is usable (often because `text-transparent` is missing), so making text opaque is a workaround—not the intended setup.

## How sizing works

Each page slot gets layout size from the PDF viewport × zoom:

```521:531:packages/file-viewer/src/renderers/PdfRenderer.tsx
          const scaledW = sz ? sz.w * scale : 0;
          const scaledH = sz ? sz.h * scale : 0;
          return (
            <div
              key={pageNum}
              data-page-num={pageNum}
              style={{
                width: scaledW || undefined,
                height: scaledH || undefined,
              }}
              className={PDF_PAGE_SLOT_CLASS}
```

On render, the canvas gets **two** size pairs:

```217:220:packages/file-viewer/src/renderers/PdfRenderer.tsx
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
```

- **HTML `width` / `height`** → backing-store pixels (e.g. 1190×1684 at 2× DPR for a 595×842 layout viewport).
- **Inline `style.width` / `style.height`** → CSS layout size (595×842 at 100% zoom).

Those numbers can look correct in DevTools while the page still **looks** broken if layout or CSS collapses the painted area, or if the bitmap was never drawn.

The canvas is **`position: absolute; inset: 0`** inside a **`relative`** page slot—it does not set the slot’s size; the slot’s inline `width`/`height` does.

```23:24:packages/file-viewer/src/renderers/pdf/textLayerTailwind.ts
export const PDF_CANVAS_CLASS =
  "pointer-events-none absolute inset-0 z-0 block max-h-none max-w-none";
```

## Why demo works and consumer doesn’t

### 1. Missing package Tailwind scan (most common)

Demo imports the package stylesheet, which now includes the compiled package utilities:

```1:2:apps/demo/src/styles.css
@import "tailwindcss";
@import "@file-viewer/react/styles.css";
```

That pulls in utilities composed in JS strings (`PDF_CANVAS_CLASS`, `TEXT_LAYER_CONTAINER_CLASS`, scrollport classes, etc.).

Without it in the consumer:

- **`[&_:is(span,br)]:text-transparent`** may be missing → text visible, canvas problem more obvious.
- **`max-w-none max-h-none`** may be missing → global `max-width: 100%` (or similar) on `canvas` can shrink it to **0×0** inside a zero- or unknown-width flex ancestor.
- **`relative` on the page slot** may be missing → `absolute inset-0` canvas anchors to the wrong ancestor and can lay out at 0×0.

### 2. Broken height chain on `FileViewer`

Renderers use `absolute inset-0 overflow-auto` inside `FileViewer`’s `relative min-h-0 flex-1` slot. The **parent chain must give a real height** and use **`min-h-0`** on flex children so the scrollport can shrink and scroll.

Demo pattern:

```264:271:apps/demo/src/App.tsx
          <div className="relative min-h-0 flex-1">
            ...
              <FileViewer
                className="absolute inset-0 min-h-0"
```

If the consumer mounts `FileViewer` in a flex row/column without `h-*` / `flex-1 min-h-0` / `absolute inset-0` on a sized parent, the scroll root can collapse. Pages may still get inline dimensions, but lazy render (`IntersectionObserver`) and stacking can behave badly.

### 3. Canvas never painted (backing store still 0)

Render runs only for pages intersecting the scroll viewport (≈600px margin). If `canvas.width` / `canvas.height` are **0**:

- Page never intersected (hidden tab, `display: none` ancestor, zero-height scroll root at first paint).
- **`zoom` is 0** → viewport scale 0.
- `getContext("2d")` failed (rare).
- Render errored before dimensions were set (check console / `onError`).

Before the first successful render, the canvas is the browser default (often 300×150), not your PDF sizes.

### 4. Host CSS overrides

Rules like `canvas { width: 100% !important; height: auto !important; }`, `max-width: 100%`, `display: none`, or `transform: scale(0)` on an ancestor can leave attributes/styles looking right while **computed layout size** is 0×0.

### 5. Misreading DevTools

| Field | Meaning |
|-------|---------|
| `width` / `height` attributes | Bitmap resolution (× DPR) |
| Inline `style` | Intended CSS size |
| **Rendered size** | Actual painted layout box—this is what “0×0” usually means |

1190×1684 attributes + 595×842 styles + **0×0 rendered** → layout/CSS collapse, not a PDF engine viewport bug.

## How to fix

1. **Import package styles** (Tailwind v4):

   ```css
   @import "tailwindcss";
   @import "@file-viewer/react/styles.css";
   ```

   `styles.css` contains the compiled package utilities and runtime CSS. It is FileViewer-root-scoped and does not require a package `@source` scan; it cannot change unrelated host Tailwind utilities or tokens. `tailwind-source.css` is a deprecated compatibility alias for this stylesheet.

2. **Size the viewer** per README:

   ```tsx
   <div className="flex h-[640px] min-h-0 flex-col">
     <FileViewer className="min-h-0 flex-1" source={source} />
   </div>
   ```

3. **Inspect the broken page in DevTools**
   - Page slot `div[data-page-num]`: computed `width` / `height` ≈ viewport × zoom.
   - `canvas`: classes include `absolute inset-0 block max-w-none max-h-none`; `canvas.width` / `height` > 0 after scroll into view.
   - Text layer container: `text-transparent` on spans when styles are correct.

4. **Remove host overrides** on `canvas` inside the viewer.

5. **Do not “fix” by removing `text-transparent`**—that only exposes the text layer when the canvas layer is broken.

## Quick checklist

| Check | Demo | Broken consumer |
|-------|------|-----------------|
| `@import "@file-viewer/react/styles.css"` | Yes | Often no |
| Sized parent + `min-h-0` flex chain | Yes | Often no |
| `canvas` bitmap `width`/`height` > 0 after scroll | Yes | Often 0 |
| Text spans transparent | Yes | Often opaque (missing utility) |
| Global `canvas` CSS | None | Sometimes present |
