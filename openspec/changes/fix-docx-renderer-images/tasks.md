## 1. Layout correction module

- [x] 1.1 Add `packages/file-viewer/src/renderers/docx/correctDocxPreviewLayout.ts` with exported `correctDocxPreviewLayout(host: HTMLElement)`
- [x] 1.2 Implement detection for 0×0 (or near-zero) drawing wrappers that contain a loaded `img`
- [x] 1.3 Restore wrapper dimensions from child image intrinsic or inline size; set wrapper `overflow: visible`
- [x] 1.4 Implement right-align correction for images inside rendered `header` regions (absolute + `right: 0`, positioned parent)
- [x] 1.5 Implement full-page background handling on first `section.docx` (absolute inset layer, `z-index: 0`, section `overflow: visible` when background detected)
- [x] 1.6 Apply behind-text stacking (`z-index: 0` on background layers; preserve text above)

## 2. Wire into DocxRenderer

- [x] 2.1 Call `correctDocxPreviewLayout(host)` after successful `renderAsync` in `DocxRenderer.tsx`
- [x] 2.2 Add dedicated `styleContainer` element sibling for `renderAsync` (styles separate from body host)
- [x] 2.3 Ensure cleanup/re-render path still replaces children before each render

## 3. Tests

- [x] 3.1 Unit test: 0px wrapper + sized `img` becomes visible (non-zero offsetWidth on wrapper or img in layout)
- [x] 3.2 Unit test: header wrapper with right-align heuristic gets `right: 0` (or equivalent) positioning
- [x] 3.3 Unit test: background layer receives lower z-index than article content
- [x] 3.4 Add integration or render test with `dataops_sample_template_v1.docx` if DOM test env available; otherwise document manual QA step in PR

## 4. Verification

- [ ] 4.1 Manually verify demo DOCX fixture: PCS logo top-right, geometric/network background on cover, title readable
- [x] 4.2 Run `pnpm test` in `packages/file-viewer` and fix failures
- [x] 4.3 Confirm no changes to public `FileViewer` exports or props
