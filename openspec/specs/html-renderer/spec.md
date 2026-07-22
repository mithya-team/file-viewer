# html-renderer Specification

## Purpose

MIME-driven HTML detection and opt-in sandboxed iframe preview via internal `HtmlRenderer`. Detection uses loaded `text/html` only — no xhtml, extension, or content sniffing. Default path is text fallback until `enableHtmlPreview` is set.

## Requirements

### Requirement: MIME-only HTML detection

The package SHALL detect `FileKind` `"html"` when loaded MIME (after magic-byte sniff miss) is `text/html` and the sampled bytes pass the existing printable-text guard. The package MUST NOT select the HTML renderer from filename extensions or HTML content heuristics. The package MUST NOT treat `application/xhtml+xml` as HTML in this change. Detection MUST carve `text/html` out of the generic `text/*` path so the same blob does not also resolve as `"text"`.

#### Scenario: text/html MIME yields html kind

- **WHEN** a buffered blob has `type` `text/html` and printable text sample bytes
- **THEN** detection SHALL return `{ kind: "html", mimeType: "text/html" }`

#### Scenario: unlabeled HTML-looking bytes stay unsupported or non-html

- **WHEN** a blob has empty or non-html MIME and content resembles HTML markup
- **THEN** detection MUST NOT return `kind: "html"` solely from content shape

#### Scenario: xhtml MIME is not html

- **WHEN** a blob has `type` `application/xhtml+xml`
- **THEN** detection MUST NOT return `kind: "html"`

#### Scenario: binary with text/html MIME is not html

- **WHEN** a blob has `type` `text/html` but sample bytes fail the printable-text guard
- **THEN** detection MUST NOT return `kind: "html"`

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

### Requirement: Sandboxed HtmlRenderer with scripts

`HtmlRenderer` SHALL display the buffered HTML blob in an `<iframe>` whose `src` is a package-created `blob:` object URL revoked on cleanup. The iframe MUST set `sandbox` to include `allow-scripts` and MUST NOT include `allow-same-origin`. The package MAY allow the document to load remote subresources (images, stylesheets, fonts, and similar). The package MUST document that enabling HTML preview runs author scripts inside the iframe and may cause network requests to third-party origins.

#### Scenario: iframe uses script-capable sandbox without same-origin

- **WHEN** `HtmlRenderer` mounts for a blob
- **THEN** the iframe element SHALL have a `sandbox` attribute that allows scripts
- **AND** SHALL NOT grant `allow-same-origin`

#### Scenario: blob URL lifecycle

- **WHEN** `HtmlRenderer` mounts and later unmounts or the blob identity changes
- **THEN** the package SHALL create an object URL for the iframe `src` and revoke prior package-created URLs on cleanup

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

### Requirement: HtmlRenderer stays internal

`HtmlRenderer` MUST remain an internal implementation detail. The package MUST NOT export the renderer component as public runtime API. TypeScript prop types for the renderer MAY be exported for consumers.

#### Scenario: package entry does not export HtmlRenderer component

- **WHEN** a consumer imports from `@file-viewer/react`
- **THEN** `HtmlRenderer` SHALL NOT be a public runtime export
