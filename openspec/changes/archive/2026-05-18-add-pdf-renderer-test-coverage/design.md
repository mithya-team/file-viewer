## Context

`PdfRenderer` uses two `useEffect` hooks: one loads `pdfjs-dist` document once per `blob`, the second paints the current page at the current zoom. `FileViewer` wires PDF chrome state, surfaces render errors via `renderError`, and stabilizes consumer `onError` with refs.

Existing tests mock `PdfRenderer` in `FileViewer.test.tsx` and track blob identity only for page-count callbacks. Production PDF behavior is untested.

Constraints: Vitest + `react-test-renderer` (existing stack), no browser E2E, mock `pdfjs-dist` and worker import, keep tests fast and deterministic.

## Goals / Non-Goals

**Goals:**

- Unit-test `PdfRenderer` in isolation with controlled pdf.js mocks.
- Assert validation (128-byte floor, `%PDF` header), load-once semantics, page/zoom re-render without second `getDocument`, real `Error` messages to `onError`, ref-stable callbacks across parent re-renders, HiDPI canvas setup.
- Add targeted `FileViewer` tests for render-error display and clear-on-navigation retry without unmocking the full pdf.js stack in integration tests (optional thin integration using a test double that invokes `onError` with a known message).

**Non-Goals:**

- Visual/regression screenshots of rendered PDF pixels.
- Testing real pdf.js worker parsing of binary PDFs in CI.
- Changing production `PdfRenderer` / `FileViewer` unless a test reveals a defect (fix in follow-up).
- Replacing all `FileViewer` PdfRenderer mocks—keep chrome/navigation tests lightweight.

## Decisions

### 1. Dedicated `PdfRenderer.test.tsx` with hoisted pdf.js mock

**Choice:** New file mocking `getDocument`, `GlobalWorkerOptions`, and `?worker` import via `vi.mock`.

**Rationale:** Exercises real component effects and canvas refs; avoids pulling pdf.js into every `FileViewer` test.

**Alternative:** Only integration tests through `FileViewer` with real pdf.js — slower, flaky, needs fixture PDF bytes.

### 2. Fake `PDFDocumentProxy` with spies on `getPage`, `destroy`, `numPages`

**Choice:** Minimal stub returned from `getDocument().promise` with `getPage` resolving a fake page (`getViewport`, `render` returning `{ promise: Promise.resolve() }`).

**Rationale:** Enough to verify call counts and canvas mutations without parsing PDFs.

### 3. HiDPI assertions via `devicePixelRatio` stub

**Choice:** `vi.stubGlobal("devicePixelRatio", 2)` (or assign on `window`) before render; assert `canvas.width` / `height` vs `style.width` / `height` and spy `CanvasRenderingContext2D#setTransform`.

**Rationale:** Matches production code path without screenshot comparison.

### 4. Ref-stability test via unstable parent callback

**Choice:** Wrapper component that re-renders with a new `onError` function identity each time; assert `getDocument` mock call count stays 1 for same blob while parent re-renders N times.

**Rationale:** Directly validates the regression that motivated `onErrorRef`.

### 5. `FileViewer` tests: partial unmock or error-injecting stub

**Choice:** Add 1–2 `FileViewer` cases using either (a) a test-only `PdfRenderer` mock that calls `onError` with a distinct message, or (b) stop mocking `PdfRenderer` only in a nested `describe` with pdf.js already mocked at module level.

**Rationale:** Verifies `failureState.error.message` and `renderError` clear on `pdfPage`/`pdfZoom` change without duplicating all PdfRenderer unit cases.

**Alternative:** Full unmock — duplicates setup; prefer error-injecting stub for integration surface only.

### 6. Export `loadPdfDocument` / `MIN_PDF_BYTES` only if needed

**Choice:** Prefer testing through public `PdfRenderer` props and mocked `getDocument`; do not export internals unless assertions require it.

**Rationale:** Keeps module boundary; validation errors surface via `onError` in component tests.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Mock drift from real pdf.js API | Keep stub shape minimal; one smoke test with tiny valid PDF bytes optional later |
| `react-test-renderer` + canvas limitations | Spy `HTMLCanvasElement.prototype.getContext` if needed; assert dimensions on ref-backed canvas |
| Flaky async timing | Use `act` + `waitFor` patterns from existing `FileViewer.test.tsx` |
| Duplicate coverage between unit and integration | Unit owns behavior; FileViewer owns error UI wiring only |

## Migration Plan

N/A — additive test files only. Run `pnpm test` in `packages/file-viewer`.

## Open Questions

None — scope is well bounded by recent PdfRenderer changes.
