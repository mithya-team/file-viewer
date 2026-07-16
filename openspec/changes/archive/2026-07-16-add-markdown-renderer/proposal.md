## Why

Markdown is a common attachment format, but labeled `text/markdown` blobs currently route to `TextRenderer` and show raw source in a `<pre>`. Consumers expect GitHub-flavored rendered preview (headings, lists, links, tables). MIME-only detection fits existing invariants; content sniffing deferred until real-world gaps appear.

## What Changes

- Add content-driven **`markdown` detection** for `text/markdown` and `text/x-markdown` only (after magic-byte miss, with `isProbablyText` guard). Unlabeled markdown stays unsupported.
- Add internal **`MarkdownRenderer`**: buffered `Blob` → string → GFM HTML via remark/rehype with **sanitize**; static preview only.
- Add **`FileKind: "markdown"`** and **`MarkdownChromeApi`** (file metadata + download only; no zoom/page/search in v1).
- Keep generic `text/*` path for `text/plain` and other textual MIME; markdown MIME must not double-route to `text`.
- Update docs, README, demo fixture (approved sample), and public type exports.
- **Out of scope:** extension sniffing, content heuristics, syntax highlighting, front-matter handling, in-document search, raw HTML-in-MD (strip via sanitize), progressive parse.

## Capabilities

### New Capabilities

- `markdown-renderer`: MIME detection for markdown, GFM render pipeline with sanitization, scrollable prose viewport, download of original blob.

### Modified Capabilities

- `public-type-exports`: Add `MarkdownChromeApi`, `MarkdownRendererProps`, and `markdown` in `FileKind` / `DetectionResult` to the documented export surface.

## Impact

- `packages/file-viewer/package.json` — `react-markdown`, `remark-gfm`, `rehype-sanitize` (or equivalent pinned stack)
- `packages/file-viewer/src/detect/detectFileKind.ts` — markdown MIME branch before generic text
- `packages/file-viewer/src/types.ts`, `src/index.ts` — `markdown` kind, chrome + props types
- `packages/file-viewer/src/renderers/MarkdownRenderer.tsx` — new renderer
- `packages/file-viewer/src/FileViewer.tsx`, chrome — routing + chrome case
- `packages/file-viewer/test/` — detection + render smoke tests
- `apps/demo` — sample `.md` fixture + MIME-labeled source
- `docs/invariants.md`, `docs/architecture.md`, `AGENTS.md`, package `README.md`
