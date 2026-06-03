## Why

TIFF is common for scanned documents and multi-page faxes, but the viewer does not sniff classic TIFF signatures and browsers do not reliably decode TIFF via `<img src="blob:…">`. Consumers hit unsupported or broken image rendering even when the server sends `image/tiff`. Supporting classical multi-page TIFF with PDF-like scroll and lazy decode matches how users read long scans and aligns with existing PDF UX in `FileViewer`.

## What Changes

- Detect **classical TIFF** by magic bytes (`II*\0`, `MM\0*`) and by loaded `image/tiff` / `image/tif` MIME after sniffing; route as `kind: "image"` (no new public `FileKind`).
- Add **UTIF.js** as a package-owned dependency (prefer vendored copy from `photopea/UTIF.js` over stale npm republish).
- Introduce an internal **multi-page TIFF scroll renderer** (stack of page slots, lazy decode on viewport intersection, same mental model as `PdfRenderer`).
- Decode each page to a **display `blob:` URL** (PNG from canvas); retain decoded URLs in a **session `Map` per source** (no LRU cap); revoke all on `source` change and unmount.
- Keep **download** pointing at the original TIFF blob URL, not decoded page blobs.
- Extend **`ImageChromeApi`** with PDF-like `page` / `pageCount` / prev / next / `setPage` when the file is a multi-page TIFF; default chrome shows page controls when `pageCount > 1`.
- **JPEG/PNG/GIF/WebP** continue using single `<img>` + existing zoom/pan (`ImageRenderer`); no behavior change.
- **Out of scope:** BigTIFF, multi‑GB single-plane TIFF, arbitrary cache caps, custom renderer registration.

## Capabilities

### New Capabilities

- `tiff-renderer`: Classical TIFF detection hooks, UTIF-based lazy multi-page scroll layout, per-page display URL cache, failed-slot handling for non-raster IFDs.

### Modified Capabilities

- `image-renderer`: Shell-owned `imagePage` / `imagePageCount` for TIFF, scroll-synced chrome page API, routing between native `ImageRenderer` and TIFF scroll path; default chrome page toolbar for multi-page TIFF.

- `public-type-exports`: Additive `ImageChromeApi` page navigation fields (documented export surface).

## Impact

- `packages/file-viewer/src/detect/detectFileKind.ts` — TIFF signatures
- `packages/file-viewer/src/renderers/` — new `TiffRenderer` (or equivalent), possible `image/` decode helpers
- `packages/file-viewer/src/FileViewer.tsx` — TIFF vs native image branch, `imagePage` state, download vs display URLs
- `packages/file-viewer/src/FileViewerDefaultChrome.tsx` — image page toolbar when TIFF `pageCount > 1`
- `packages/file-viewer/src/types.ts`, `src/index.ts` — `ImageChromeApi` extensions
- `packages/file-viewer/package.json` — UTIF dependency or vendored `UTIF.js`
- `packages/file-viewer/test/` — `detectFileKind`, TIFF renderer, `FileViewer` integration
- `docs/architecture.md` — images include library-decoded TIFF
- `apps/demo` — sample TIFF fixture when approved; demo chrome parity optional
