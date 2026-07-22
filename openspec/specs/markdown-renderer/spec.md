# markdown-renderer Specification

## Purpose

MIME-driven markdown detection and internal GFM static preview via `MarkdownRenderer` (`react-markdown` + `remark-gfm` + `rehype-sanitize`). Detection uses loaded `text/markdown` / `text/x-markdown` only — no extension or content sniffing.

## Requirements

### Requirement: MIME-driven markdown detection

The package SHALL detect markdown only when loaded MIME is `text/markdown` or `text/x-markdown` and the sampled bytes pass the existing printable-text guard (`isProbablyText`). Detection MUST NOT use filename extensions or markdown content heuristics.

#### Scenario: text/markdown with printable bytes

- **WHEN** a buffered `Blob` has `type` `text/markdown` and printable UTF-8 text bytes
- **THEN** `detectFileKind` SHALL return `{ kind: "markdown", mimeType: "text/markdown" }` (or the normalized loaded MIME)

#### Scenario: text/x-markdown with printable bytes

- **WHEN** a buffered `Blob` has `type` `text/x-markdown` and printable UTF-8 text bytes
- **THEN** `detectFileKind` SHALL return `kind: "markdown"`

#### Scenario: markdown MIME with non-text bytes

- **WHEN** a buffered `Blob` has `type` `text/markdown` but bytes fail the printable-text guard
- **THEN** `detectFileKind` SHALL return `kind: "unsupported"`

#### Scenario: unlabeled markdown-looking text

- **WHEN** a buffered `Blob` contains markdown-like text (e.g. `# Heading`) with empty or non-markdown MIME
- **THEN** `detectFileKind` SHALL NOT return `kind: "markdown"`
- **AND** SHALL follow existing unlabeled-text rules (`unsupported` unless another MIME path applies)

#### Scenario: text/plain remains text

- **WHEN** a buffered `Blob` has `type` `text/plain` and printable text
- **THEN** `detectFileKind` SHALL return `kind: "text"` (not `markdown`)

### Requirement: Markdown routes to MarkdownRenderer

When detection returns `kind: "markdown"` and shell `viewMode` is `"preview"`, `FileViewer` SHALL render the internal `MarkdownRenderer` with the buffered blob. When `viewMode` is `"source"`, the shell SHALL mount `TextRenderer` instead. The `MarkdownRenderer` component MUST NOT be exported as public runtime API.

#### Scenario: Ready markdown file preview

- **WHEN** `FileViewer` reaches ready state with `detection.kind === "markdown"` and `viewMode` is `"preview"`
- **THEN** the viewer SHALL mount `MarkdownRenderer` for that blob
- **AND** SHALL NOT mount `TextRenderer` for that detection

#### Scenario: Ready markdown file source

- **WHEN** `FileViewer` reaches ready state with `detection.kind === "markdown"` and `viewMode` is `"source"`
- **THEN** the viewer SHALL mount `TextRenderer` for that blob
- **AND** SHALL NOT mount `MarkdownRenderer`

### Requirement: GFM static preview with sanitization

`MarkdownRenderer` SHALL render GitHub-flavored Markdown as a static, scrollable preview including headings, lists, links, tables, strikethrough, task lists, and autolinks. Rendering MUST sanitize output so scripts and unsafe URLs from the source cannot execute. The package MUST NOT execute embedded scripts or inject unsanitized HTML from the loaded document.

#### Scenario: GFM table and heading

- **WHEN** the markdown blob contains an ATX heading and a GFM pipe table
- **THEN** the renderer SHALL present them as structured HTML elements (heading and table), not as a single monospace source dump

#### Scenario: Script payload stripped

- **WHEN** the markdown source includes a `<script>` tag or `javascript:` URL
- **THEN** the rendered preview SHALL NOT execute that script
- **AND** the dangerous markup SHALL be stripped or neutralized by sanitization

#### Scenario: Render failure surfaces through shell

- **WHEN** reading or rendering the markdown blob fails
- **THEN** the renderer SHALL call `onError`
- **AND** the package shell SHALL show the existing error/fallback path

### Requirement: MarkdownChromeApi file metadata only

When `api.file.kind` is `"markdown"`, `FileViewerChromeApi` SHALL narrow to `MarkdownChromeApi` with `file: { kind: "markdown"; mimeType: string; downloadUrl: string | null }` and a required `markdown: { viewMode: ContentViewMode; setViewMode: (mode: ContentViewMode) => void }` branch. v1 MUST NOT require page, zoom, or search controls on the markdown chrome branch.

#### Scenario: Consumer narrows markdown chrome

- **WHEN** a consumer writes `if (api.file.kind === "markdown") return api.file.downloadUrl;`
- **THEN** TypeScript SHALL resolve `api.file.kind` as `"markdown"`
- **AND** `downloadUrl` SHALL point at the original buffered markdown bytes when the package created a download URL

#### Scenario: Consumer reads markdown viewMode

- **WHEN** a consumer narrows `api.file.kind === "markdown"` and reads `api.markdown.viewMode`
- **THEN** TypeScript SHALL resolve `viewMode` as `ContentViewMode`

### Requirement: Download uses original markdown bytes

Download for markdown SHALL use the original buffered blob (same package download URL pattern as other text-like formats), not a rendered HTML export.

#### Scenario: Download preserves source

- **WHEN** chrome exposes `downloadUrl` for a markdown file
- **THEN** fetching that URL SHALL yield the original markdown source bytes
