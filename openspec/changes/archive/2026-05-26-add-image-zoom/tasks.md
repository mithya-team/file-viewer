## 1. Zoom helpers

- [x] 1.1 Add `imageZoom.ts` with `MIN_IMAGE_ZOOM` (40), `MAX_IMAGE_ZOOM` (200), `DEFAULT_IMAGE_ZOOM` (100), `IMAGE_ZOOM_TOOLBAR_STEP` (10)
- [x] 1.2 Implement `clampImageZoom` and `zoomAfterImageClick` per spec sequential rules
- [x] 1.3 Unit test step sequence (100→150→175→185→195→200), clamp, and no-op at 200

## 2. Types and shell state

- [x] 2.1 Extend `ImageChromeApi` with `image` namespace in `types.ts`
- [x] 2.2 Extend `ImageRendererProps` with `zoom`, `onStepZoom`, `onResetZoom`
- [x] 2.3 Add `imageZoom` state to `FileViewer`, reset on `source` change, clear render error on zoom change
- [x] 2.4 Wire `createChromeApi` image branch (`zoomIn`/`zoomOut`/`setZoom`/`stepZoomIn`/`resetZoom`)
- [x] 2.5 Pass `zoom`, `onStepZoom`, `onResetZoom` into `ImageRenderer`

## 3. ImageRenderer

- [x] 3.1 Replace fit-only layout with scroll container + percentage width zoom
- [x] 3.2 Implement pointer pan when overflow (suppress step zoom on drag)
- [x] 3.3 Wire single-click → `onStepZoom`, double-click → `onResetZoom`

## 4. Chrome and docs

- [x] 4.1 Add image zoom controls to `FileViewerDefaultChrome` (− / % / +)
- [x] 4.2 Add image zoom branch to `DemoViewerChrome` (demo parity)
- [x] 4.3 Document image chrome and mouse zoom in `packages/file-viewer/README.md`

## 5. Tests and verification

- [x] 5.1 `FileViewer` tests: custom chrome drives `api.image.zoomIn` / zoom prop to mock renderer
- [x] 5.2 `FileViewer` test: `chrome="none"` still passes zoom callbacks to `ImageRenderer`
- [x] 5.3 `ImageRenderer` test (or integration): double-click / click handlers invoke callbacks
- [x] 5.4 Run package tests and fix regressions
