## MODIFIED Requirements

### Requirement: Opt-in HTML iframe preview

`FileViewer` SHALL accept an optional boolean prop `enableHtmlPreview` defaulting to `false`. When detection kind is `"html"` and `enableHtmlPreview` is `true` and shell `viewMode` is `"preview"`, the shell SHALL render via internal `HtmlRenderer`. When kind is `"html"` and `enableHtmlPreview` is `true` and `viewMode` is `"source"`, the shell SHALL render via `TextRenderer`. When kind is `"html"` and `enableHtmlPreview` is `false` or omitted, the shell SHALL render via `TextRenderer` (text fallback), not via an iframe, regardless of `viewMode`.

#### Scenario: default is text fallback

- **WHEN** a consumer mounts `FileViewer` with a `text/html` source and does not pass `enableHtmlPreview`
- **THEN** the package SHALL NOT mount an HTML preview iframe
- **AND** SHALL present the document contents through the text renderer path

#### Scenario: opt-in enables iframe in preview mode

- **WHEN** a consumer mounts `FileViewer` with a `text/html` source and `enableHtmlPreview={true}` and `viewMode` is `"preview"`
- **THEN** the package SHALL mount `HtmlRenderer` for that blob

#### Scenario: opt-in source mode uses text path

- **WHEN** a consumer mounts `FileViewer` with a `text/html` source and `enableHtmlPreview={true}` and `viewMode` is `"source"`
- **THEN** the package SHALL mount `TextRenderer`
- **AND** SHALL NOT mount `HtmlRenderer`

### Requirement: HTML chrome and download

For `kind: "html"`, chrome SHALL expose `HtmlChromeApi` with file metadata (`kind`, `mimeType`, `downloadUrl`). When `enableHtmlPreview` is true, chrome SHALL also expose optional `html: { viewMode: ContentViewMode; setViewMode: (mode: ContentViewMode) => void }`. When `enableHtmlPreview` is false, `html` MUST be omitted. Download SHALL use the original buffered blob bytes, not a rewritten document. v1 MUST NOT require page, zoom, or search controls on the HTML chrome branch.

#### Scenario: download uses original blob

- **WHEN** chrome requests download for an HTML file
- **THEN** the download URL SHALL refer to the original buffered blob contents

#### Scenario: html controls present when preview enabled

- **WHEN** `enableHtmlPreview` is true and `api.file.kind` is `"html"`
- **THEN** `api.html` SHALL expose `viewMode` and `setViewMode`

#### Scenario: html controls absent when preview disabled

- **WHEN** `enableHtmlPreview` is false and `api.file.kind` is `"html"`
- **THEN** `api.html` SHALL be undefined
