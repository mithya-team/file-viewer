## Why

Markdown and HTML only expose rendered preview (or, for HTML without `enableHtmlPreview`, a forced text dump). Users and custom chrome need a Preview | Source switch to inspect original bytes without downloading.

## What Changes

- Shell-owned `viewMode: "preview" | "source"` for markdown and HTML, default `"preview"`.
- `MarkdownChromeApi` always exposes `markdown: { viewMode, setViewMode }`.
- `HtmlChromeApi` exposes optional `html: { viewMode, setViewMode }` only when `enableHtmlPreview` is true; otherwise file-only chrome and forced text path (toggle dropped).
- Source mode mounts existing `TextRenderer` (plain monospace). No syntax highlighting.
- Default chrome shows Preview | Source controls when applicable.
- Export `ContentViewMode` from package entry.
- Reset `viewMode` to `"preview"` when `source` or `detection.kind` changes.
- When `enableHtmlPreview` flips true → false: force text path and drop toggle (ignore stale `viewMode`).

## Capabilities

### New Capabilities

- `content-view-mode`: Shared shell/chrome Preview | Source mode for markdown and HTML (state, reset, default chrome UI, public `ContentViewMode` type).

### Modified Capabilities

- `markdown-renderer`: Source mode mounts `TextRenderer`; chrome gains required `markdown.viewMode` / `setViewMode` (replaces file-metadata-only chrome requirement).
- `html-renderer`: When `enableHtmlPreview`, preview vs source respects `viewMode`; optional `html` chrome branch; mid-mount disable forces text + drops toggle.
- `public-type-exports`: Export `ContentViewMode`; document widened `MarkdownChromeApi` / `HtmlChromeApi`.

## Impact

- `packages/file-viewer/src/types.ts`, `FileViewer.tsx`, `FileViewerDefaultChrome.tsx`, `index.ts`
- Docs: README, invariants (chrome surface)
- Tests: FileViewer routing + chrome API; default chrome toggle
- No new runtime dependencies
