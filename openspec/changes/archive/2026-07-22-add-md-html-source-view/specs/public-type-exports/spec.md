## ADDED Requirements

### Requirement: Package entry exports ContentViewMode

`@file-viewer/react` SHALL re-export type `ContentViewMode` (`"preview" | "source"`) from its primary entrypoint using a type-only export so it appears in `dist/index.d.ts`.

#### Scenario: Consumer imports ContentViewMode

- **WHEN** a consumer writes `import type { ContentViewMode } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type from the package entry

### Requirement: MarkdownChromeApi includes view mode controls

Exported `MarkdownChromeApi` SHALL include a required `markdown` object with `viewMode: ContentViewMode` and `setViewMode: (mode: ContentViewMode) => void` in addition to `file` metadata.

#### Scenario: Consumer types markdown setViewMode

- **WHEN** a consumer writes `api.markdown.setViewMode("source")` after narrowing `api.file.kind === "markdown"`
- **THEN** TypeScript SHALL accept the call

### Requirement: HtmlChromeApi optional html view mode controls

Exported `HtmlChromeApi` SHALL include optional `html?: { viewMode: ContentViewMode; setViewMode: (mode: ContentViewMode) => void }` in addition to `file` metadata.

#### Scenario: Consumer types optional html controls

- **WHEN** a consumer writes `api.html?.setViewMode("preview")` after narrowing `api.file.kind === "html"`
- **THEN** TypeScript SHALL accept the optional chaining call
