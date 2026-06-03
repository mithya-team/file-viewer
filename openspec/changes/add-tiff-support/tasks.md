## 1. Detection and TIFF utilities

- [x] 1.1 Add classical TIFF magic-byte sniff (`II*\0`, `MM\0*`) in `detectFileKind.ts` with unit tests
- [x] 1.2 Add `isTiffDetection` / `isTiffBlob` helper from `DetectionResult` + MIME
- [x] 1.3 Vendor `UTIF.js` from Photopea (pinned path + license) and add `decodeTiffIfdCount` / `decodeTiffPageToPngBlob` helpers with focused unit tests (mock or minimal fixture bytes)

## 2. TiffRenderer

- [x] 2.1 Create internal `TiffRenderer` with vertical scroll stack, page slots, and gap styling aligned with PDF patterns
- [x] 2.2 Implement `IntersectionObserver` lazy decode, session `Map` display URL cache, and revoke-on-unmount/source change
- [x] 2.3 Implement per-slot error UI for failed IFD decode; whole-file `onError` when `UTIF.decode` fails
- [x] 2.4 Wire `onVisiblePageChange`, `page` prop → `scrollIntoView`, and programmatic scroll guard (mirror PDF)
- [x] 2.5 Apply shell `imageZoom` to decoded page `<img>` elements (CSS width scaling, no re-decode per zoom tick)
- [x] 2.6 Add `TiffRenderer` tests (lazy decode, cache reuse, visible page reporting, slot failure)

## 3. FileViewer shell integration

- [x] 3.1 Add `imagePage` / `imagePageCount` state; reset and clamp on `source` / count change
- [x] 3.2 Route TIFF to `TiffRenderer`; keep `ImageRenderer` + single `objectUrl` for other images
- [x] 3.3 Separate download URL (original TIFF blob) from TIFF display URLs
- [x] 3.4 Extend `createChromeApi` `image` branch with page navigation fields
- [x] 3.5 Clear render errors on `imagePage` change; extend `FileViewer` integration tests

## 4. Chrome, types, and docs

- [x] 4.1 Update `FileViewerDefaultChrome` for multi-page TIFF page toolbar (reuse `PdfPageInput` or shared page input)
- [x] 4.2 Update `ImageChromeApi` in `types.ts` and `public-type-exports` spec alignment in `index.ts` exports
- [x] 4.3 Update `docs/architecture.md` and package `README.md` for TIFF scroll + lazy decode
- [x] 4.4 Add demo sample TIFF entry when fixture is approved (optional if blocked on approval)

## 5. Verification

- [x] 5.1 Run `pnpm test` and `pnpm typecheck` in `packages/file-viewer`
- [ ] 5.2 Manual smoke in demo: single-page TIFF, multi-page TIFF scroll, download original, chrome page jump
