## MODIFIED Requirements

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

### Requirement: MarkdownChromeApi file metadata only

When `api.file.kind` is `"markdown"`, `FileViewerChromeApi` SHALL narrow to `MarkdownChromeApi` with `file: { kind: "markdown"; mimeType: string; downloadUrl: string | null }` and a required `markdown: { viewMode: ContentViewMode; setViewMode: (mode: ContentViewMode) => void }` branch. v1 MUST NOT require page, zoom, or search controls on the markdown chrome branch.

#### Scenario: Consumer narrows markdown chrome

- **WHEN** a consumer writes `if (api.file.kind === "markdown") return api.file.downloadUrl;`
- **THEN** TypeScript SHALL resolve `api.file.kind` as `"markdown"`
- **AND** `downloadUrl` SHALL point at the original buffered markdown bytes when the package created a download URL

#### Scenario: Consumer reads markdown viewMode

- **WHEN** a consumer narrows `api.file.kind === "markdown"` and reads `api.markdown.viewMode`
- **THEN** TypeScript SHALL resolve `viewMode` as `ContentViewMode`
