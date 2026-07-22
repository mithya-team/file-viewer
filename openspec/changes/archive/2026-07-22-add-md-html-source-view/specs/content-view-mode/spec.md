## ADDED Requirements

### Requirement: Shell-owned content view mode

`FileViewer` SHALL maintain a shell state `viewMode` of type `ContentViewMode` (`"preview" | "source"`) with default `"preview"`. The mode SHALL apply to markdown always and to HTML when `enableHtmlPreview` is true. Source mode SHALL mount the existing internal `TextRenderer` (plain monospace). Preview mode SHALL mount `MarkdownRenderer` or `HtmlRenderer` as appropriate. The package MUST NOT add a controlled `viewMode` prop on `FileViewerProps` in this change.

#### Scenario: Markdown defaults to preview

- **WHEN** `FileViewer` reaches ready state with `detection.kind === "markdown"`
- **THEN** `viewMode` SHALL be `"preview"`
- **AND** the shell SHALL mount `MarkdownRenderer`

#### Scenario: Markdown source mounts TextRenderer

- **WHEN** markdown is ready and chrome sets `viewMode` to `"source"`
- **THEN** the shell SHALL mount `TextRenderer` for the buffered blob
- **AND** SHALL NOT mount `MarkdownRenderer`

#### Scenario: HTML with preview enabled defaults to iframe

- **WHEN** html is ready, `enableHtmlPreview` is true, and `viewMode` is `"preview"`
- **THEN** the shell SHALL mount `HtmlRenderer`

#### Scenario: HTML source with preview enabled

- **WHEN** html is ready, `enableHtmlPreview` is true, and `viewMode` is `"source"`
- **THEN** the shell SHALL mount `TextRenderer`
- **AND** SHALL NOT mount `HtmlRenderer`

#### Scenario: HTML without preview ignores viewMode

- **WHEN** html is ready and `enableHtmlPreview` is false
- **THEN** the shell SHALL mount `TextRenderer` regardless of `viewMode`
- **AND** SHALL NOT mount `HtmlRenderer`

### Requirement: Reset viewMode on source or kind change

The shell SHALL reset `viewMode` to `"preview"` when the `source` prop identity changes or when `detection.kind` changes after a successful load.

#### Scenario: New source resets to preview

- **WHEN** the consumer changes `source` while `viewMode` was `"source"`
- **AND** the new load reaches ready
- **THEN** `viewMode` SHALL be `"preview"`

#### Scenario: Kind change resets to preview

- **WHEN** a load completes with a different `detection.kind` than the previous ready kind while `viewMode` was `"source"`
- **THEN** `viewMode` SHALL be `"preview"`

### Requirement: Markdown chrome exposes view mode controls

When `api.file.kind` is `"markdown"`, `MarkdownChromeApi` SHALL include a required `markdown` object with `viewMode: ContentViewMode` and `setViewMode: (mode: ContentViewMode) => void` that updates shell state.

#### Scenario: Consumer sets markdown source mode

- **WHEN** custom chrome calls `api.markdown.setViewMode("source")` for a markdown file
- **THEN** `api.markdown.viewMode` SHALL become `"source"`
- **AND** the shell SHALL show source via `TextRenderer`

### Requirement: HTML chrome exposes optional view mode controls

When `api.file.kind` is `"html"` and `enableHtmlPreview` is true, `HtmlChromeApi` SHALL include `html: { viewMode, setViewMode }` with the same semantics as markdown. When `enableHtmlPreview` is false, `HtmlChromeApi` MUST omit `html` (file metadata only).

#### Scenario: Toggle available when preview enabled

- **WHEN** html is ready and `enableHtmlPreview` is true
- **THEN** `api.html` SHALL be defined with `viewMode` and `setViewMode`

#### Scenario: Toggle omitted when preview disabled

- **WHEN** html is ready and `enableHtmlPreview` is false
- **THEN** `api.html` SHALL be undefined

#### Scenario: Disabling preview mid-mount drops toggle

- **WHEN** `enableHtmlPreview` changes from true to false while html is ready
- **THEN** `api.html` SHALL become undefined
- **AND** the shell SHALL mount `TextRenderer` (force text path)

### Requirement: Default chrome Preview | Source controls

When `chrome` is `"default"` and the file is markdown, default chrome SHALL render Preview and Source controls reflecting `viewMode`. When the file is html and `api.html` is defined, default chrome SHALL render the same controls. When html and `api.html` is undefined, default chrome MUST NOT render those controls.

#### Scenario: Markdown default chrome shows toggle

- **WHEN** default chrome renders for markdown
- **THEN** it SHALL present Preview and Source controls
- **AND** the active control SHALL match `api.markdown.viewMode`

#### Scenario: HTML default chrome hides toggle without preview

- **WHEN** default chrome renders for html without `api.html`
- **THEN** it SHALL NOT present Preview or Source controls
