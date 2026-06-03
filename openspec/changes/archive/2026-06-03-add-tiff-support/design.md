## Context

`detectFileKind` recognizes JPEG, PNG, GIF, and WebP by magic bytes and falls back to `image/*` MIME. Classical TIFF (`II*\0`, `MM\0*`) is not sniffed; bare TIFF bytes with empty type are **unsupported**. When `image/tiff` is set, routing is `kind: "image"`, but `FileViewer` passes the raw blob through `URL.createObjectURL` to `ImageRenderer`, which fails in most evergreen browsers.

`PdfRenderer` already implements the target UX: vertical scroll stack, lazy render via `IntersectionObserver`, scroll-driven `onVisiblePageChange`, toolbar prev/next + page input, and programmatic `scrollIntoView` when `page` changes.

## Goals / Non-Goals

**Goals:**

- Classical TIFF detection (magic + loaded MIME).
- Multi-page TIFF as a scroll stack with lazy per-page decode (UTIF.js).
- Display via `blob:` URLs from decoded PNG blobs (not `data:` base64 in `src`).
- Session `Map<pageIndex, displayUrl>` for decoded pages; revoke all on `source` change / unmount; **no LRU cap** (lazy decode bounds work to visited/near-viewport pages).
- `kind: "image"` unchanged; native raster images unchanged (`ImageRenderer`).
- `ImageChromeApi` page fields + default chrome PDF-like controls when TIFF `pageCount > 1`.
- Download URL remains the original TIFF blob.

**Non-Goals:**

- BigTIFF, multi‑GB single-plane TIFF.
- New public `FileKind` or exported `TiffRenderer`.
- Progressive/streaming TIFF decode before full blob is loaded.
- Wheel/pinch zoom changes beyond existing image zoom rules.
- Filename-based routing.

## Decisions

### 1. UTIF.js from Photopea repo, not assumed npm freshness

**Choice:** Vendor `UTIF.js` into the package (e.g. `src/vendor/UTIF.js` or `src/image/UTIF.js`) and import from there; document version pin in a comment.

**Rationale:** Maintainer guidance warns the npm `utif` package may lag; vendoring keeps decode behavior predictable and SSR-safe if imported only from client-only renderer paths.

**Alternatives:** `npm install utif` — rejected as primary without verification against upstream.

### 2. Internal `TiffRenderer` + `isTiffBlob` helper

**Choice:** New internal renderer module; `FileViewer` chooses `TiffRenderer` vs `ImageRenderer` when detection/MIME indicates TIFF.

**Rationale:** Native single-image zoom/pan differs from multi-page scroll stack; keeps one React component per file convention.

### 3. Scroll + lazy decode mirrors `PdfRenderer`

**Choice:**

- One slot per IFD index (1-based page numbers in chrome).
- `IntersectionObserver` with root margin aligned with PDF (~600px).
- Decode on intersect: `UTIF.decode` once per blob → IFD list; per page `UTIF.decodeImage` + `UTIF.toRGBA8` → `ImageData` → offscreen canvas → `canvas.toBlob("image/png")` → `createObjectURL`.
- Store URL in `Map`; reuse if slot re-enters viewport.
- `onVisiblePageChange` → shell `imagePage`; `page` prop → `scrollIntoView` with programmatic guard (reuse PDF timing pattern).

**Rationale:** User asked for PDF-like scroll, not single-page flip; lazy decode avoids decoding all IFDs upfront.

**Alternatives:** Single-page + prev/next only — rejected in exploration.

### 4. Display URL cache: full `Map`, no LRU

**Choice:** Retain every successfully decoded page URL until `source` changes; revoke entire map in cleanup.

**Rationale:** URL strings are small; memory is in backing PNG blobs. Lazy render caps growth unless the user scrolls through every page — acceptable for v1; no arbitrary fax page cap.

### 5. IFD index = page number; failed decode = slot error

**Choice:** `pageCount = ifds.length` from `UTIF.decode`. If `decodeImage` / `toRGBA8` fails for an IFD, show per-slot error UI; do not mark whole file unsupported.

**Rationale:** Some IFDs are thumbnails/metadata; failing one slot should not break the document.

### 6. Shell state: `imagePage`, `imagePageCount`

**Choice:** Mirror `pdfPage` / `pdfPageCount`; reset on `source` change; clamp when count changes. Clear render errors on `imagePage` and `imageZoom` change.

**Rationale:** Consistent chrome API; PDF precedent.

### 7. Zoom on TIFF

**Choice:** Apply shell `imageZoom` to each rendered page slot (width % or scale on `<img>`), same clamp/rules as `ImageRenderer`.

**Rationale:** Reuse existing `imageZoom` state and chrome; re-render or rescale decoded display when zoom changes (may regenerate blob URLs or CSS-scale — implementer picks CSS width % on `<img>` first to avoid re-decode on every zoom step).

**Preference:** CSS width scaling on decoded `<img>` like `ImageRenderer` to avoid re-decoding UTIF on each zoom tick.

### 8. Chrome: page controls when `pageCount > 1` only

**Choice:** Default chrome shows prev / page input / next + zoom for TIFF with `pageCount > 1`. JPEG/PNG keep zoom-only (no page row).

**Rationale:** Avoid clutter on single-page images; match PDF toolbar patterns for multi-page TIFF.

### 9. Detection additions in `detectFileKind`

**Choice:** After WebP sniff, before OLE:

- `49 49 2A 00` → `image`, `image/tiff`
- `4D 4D 00 2A` → `image`, `image/tiff`

**Rationale:** Magic-first per invariants.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Main-thread decode jank on large pages | Lazy decode; only near-viewport; document in README |
| User scrolls entire 200-page fax | Memory grows with decoded pages; acceptable v1; revisit eviction if OOM reported |
| UTIF unsupported compression | Per-slot error + `onError` optional; whole-file error only if `UTIF.decode` fails |
| Thumbnail/metadata IFDs | Per-slot failure, not global unsupported |
| Zoom + re-decode cost | Prefer CSS scaling on display `<img>` |
| Vendored UTIF license | MIT; keep LICENSE alongside vendored file |

## Migration Plan

- Additive dependency/vendor file and internal renderer; no public API break.
- Consumers with custom chrome may ignore new `api.image.page*` fields until needed.
- Demo: add approved minimal multi-page TIFF under `apps/demo/public/sample-files` when fixture approval is granted.

## Open Questions

- Exact root margin constant: reuse PDF `OBSERVER_MARGIN` or shared constant module.
- Demo fixture approval for multi-page TIFF sample (per `invariants.md`).
