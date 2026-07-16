## Why

Labeled `text/html` blobs currently fall through the generic `text/*` path and show as a monospace dump. Consumers need an opt-in HTML preview for mostly-trusted documents, with a safe default that does not run author scripts until the host explicitly enables it.

## What Changes

- Add content-driven **`html` detection** for `text/html` only (after magic-byte miss, with `isProbablyText` guard). No xhtml MIME. No extension or content heuristics.
- Add internal **`HtmlRenderer`**: buffered `Blob` → sandboxed `<iframe>` with `allow-scripts` and **without** `allow-same-origin`; remote subresources allowed and documented.
- Add **`FileViewer` prop `enableHtmlPreview`** (default `false`): when false, `text/html` still detects as `html` for chrome/kind honesty but renders via **text fallback**; when true, uses `HtmlRenderer`.
- Add **`FileKind: "html"`** and **`HtmlChromeApi`** (file metadata + download only; no zoom/page/search in v1).
- Carve `text/html` out of the generic `text/*` branch so it does not double-route.
- Update docs/invariants (scripts only when opted in), README, demo fixture, public type exports.
- **Out of scope:** xhtml, CSP injection, `allow-same-origin`, further sandbox tokens, extension sniffing, progressive load, opt-out-of-network fetches.

## Capabilities

### New Capabilities

- `html-renderer`: MIME detection for HTML, opt-in sandboxed iframe preview, text fallback when disabled, download of original blob.

### Modified Capabilities

- `public-type-exports`: Add `HtmlChromeApi`, `HtmlRendererProps`, `enableHtmlPreview` on `FileViewerProps`, and `html` in `FileKind` / `DetectionResult` to the documented export surface.

## Impact

- `packages/file-viewer/src/detect/detectFileKind.ts` — `text/html` branch before generic text
- `packages/file-viewer/src/types.ts`, `src/index.ts` — `html` kind, chrome + props + `enableHtmlPreview`
- `packages/file-viewer/src/renderers/HtmlRenderer.tsx` — new renderer
- `packages/file-viewer/src/FileViewer.tsx`, chrome — routing gated by prop + chrome case
- `packages/file-viewer/test/` — detection + render + opt-in gating tests
- `apps/demo` — sample `.html` fixture + MIME-labeled source + prop demo
- `docs/invariants.md`, `docs/architecture.md`, `AGENTS.md`, package `README.md`
