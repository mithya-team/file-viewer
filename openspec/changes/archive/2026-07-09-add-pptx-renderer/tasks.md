## 1. Dependencies and detection

- [x] 1.1 Add `@pagus-kit/core@0.1.1` and `@pagus-kit/renderer@0.1.1` to `packages/file-viewer/package.json`; run `pnpm install`
- [x] 1.2 Extend `inferOpenXmlKind` for `ppt/` → `pptx`; add `PPTX_MIME` set (presentation + template); extend `FileKind` / `DetectionResult` in `types.ts`
- [x] 1.3 Update `detectFileKind.test.ts`: flip ppt zip test to `pptx`; add POTX MIME and discrimination cases

## 2. Shared scroll hook

- [x] 2.1 Create `usePaginatedScrollStack.ts` with dual observers, visible-page reporting, programmatic scroll guard, `layoutKey`, callback refs
- [x] 2.2 Add unit tests for hook behavior (visible page, guard, prefetch callback) or document manual test plan if hook testing is deferred

## 3. PptxRenderer

- [x] 3.1 Create `PptxRenderer.tsx`: parse effect (`pagusParse`, `buildFontSubstitutes`), loading state, `onPageCountChange`
- [x] 3.2 Implement lazy `renderSlide` on viewport intersection, session SVG cache, per-slot error states
- [x] 3.3 Mount SVG via DOMParser + wrapper sizing; apply zoom via slot dimensions (no re-render on zoom)
- [x] 3.4 Wire `usePaginatedScrollStack` with `layoutKey: zoom` and `onVisiblePageChange`
- [x] 3.5 Add `PptxRenderer` tests (cache reuse, parse failure, slot failure) or integration test with fixture

## 4. FileViewer shell integration

- [x] 4.1 Add `pptxPage`, `pptxPageCount`, `pptxZoom` state; reset/clamp on `source` change
- [x] 4.2 Route `detection.kind === "pptx"` to `PptxRenderer` in `readyContent`
- [x] 4.3 Add `pptx` branch to `createChromeApi` with `PptxChromeApi` (PDF-like page + zoom)
- [x] 4.4 Update `FileViewerDefaultChrome` with pptx page/zoom controls

## 5. Types, exports, and verification

- [x] 5.1 Export `PptxChromeApi`, `PptxRendererProps` from `index.ts`; update `verify-dist.mjs` required types
- [x] 5.2 Run `pnpm typecheck` and `pnpm test` in `packages/file-viewer`; run `pnpm build` and note dist size delta

## 6. Demo and docs

- [x] 6.1 Copy pptx fixture(s) to `apps/demo/public/sample-files`; add `pptx` to `DemoFileType`, `FILE_PATHS`, `demoUrlParams`
- [x] 6.2 Update `DemoViewerChrome` with pptx branch
- [x] 6.3 Update `docs/invariants.md`, `docs/architecture.md`, `AGENTS.md`, `future_work.md`, package `README.md` for PPTX support

## 7. Manual smoke

- [x] 7.1 Demo: load pptx via URL/blob/stream/base64; verify scroll, page chrome, zoom, download
- [x] 7.2 Demo: load POTX or pptx with template MIME if fixture available
