## ADDED Requirements

### Requirement: MarkdownChromeApi exported from package entry

`@file-viewer/react` SHALL re-export `MarkdownChromeApi` from its primary entrypoint. When `api.file.kind` is `"markdown"`, `FileViewerChromeApi` SHALL narrow to `MarkdownChromeApi` with:

- `file: { kind: "markdown"; mimeType: string; downloadUrl: string | null }`

#### Scenario: Consumer narrows markdown chrome API

- **WHEN** a consumer writes `if (api.file.kind === "markdown") return api.file.mimeType;`
- **THEN** TypeScript SHALL resolve `api.file.mimeType` without error

### Requirement: MarkdownRendererProps type-only export

`MarkdownRendererProps` SHALL be exported as a type-only export documenting at least `blob` and `onError`. The `MarkdownRenderer` component SHALL NOT be exported.

#### Scenario: Consumer imports MarkdownRendererProps

- **WHEN** a consumer writes `import type { MarkdownRendererProps } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type
- **AND** `MarkdownRenderer` SHALL NOT be importable from the package entry

### Requirement: FileKind includes markdown

`FileKind` and `DetectionResult` exported from the package entry SHALL include the `"markdown"` variant.

#### Scenario: Consumer handles markdown in FileKind switch

- **WHEN** a consumer switches on `DetectionResult["kind"]`
- **THEN** TypeScript SHALL require handling `"markdown"` for exhaustiveness

## MODIFIED Requirements

### Requirement: Package entry exports documented public types

`@file-viewer/react` SHALL re-export the following types from its primary entrypoint (`@file-viewer/react`) using type-only exports so they appear in `dist/index.d.ts` without adding runtime exports:

**Core / FileViewer**

- `FileViewerSource`
- `FileViewerProps`
- `FileViewerChrome`
- `FileViewerChromeApi`
- `FileViewerErrorContext`
- `FileKind`
- `DetectionResult`

**Per-format chrome APIs**

- `ImageChromeApi`
- `PDFChromeApi`
- `SpreadsheetChromeApi`
- `DocxChromeApi`
- `TextChromeApi`
- `PptxChromeApi`
- `MarkdownChromeApi`
- `UnsupportedChromeApi`
- `PageNavigateEvent`
- `PageNavigateListener`

**Source classification**

- `StringSourceKind`

**Renderer props (types only; components not exported)**

- `PdfRendererProps`
- `ImageRendererProps`
- `SpreadsheetRendererProps`
- `DocxRendererProps`
- `TextRendererProps`
- `PptxRendererProps`
- `MarkdownRendererProps`

**PDF search**

- `PdfSearchMatch`
- `PdfSearchState`

#### Scenario: Consumer imports chrome API types from package entry

- **WHEN** a consumer writes `import type { PDFChromeApi, FileViewerChromeApi } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve both types without deep-importing `dist/types` or source paths

#### Scenario: Consumer imports detection types from package entry

- **WHEN** a consumer writes `import type { FileKind, DetectionResult } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve both types from the package entry

#### Scenario: Consumer imports renderer prop types without renderer components

- **WHEN** a consumer writes `import type { PdfRendererProps } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type
- **AND** importing `PdfRenderer` from `@file-viewer/react` SHALL NOT be part of the public API

#### Scenario: Package entry does not export renderer runtime

- **WHEN** a consumer inspects the runtime export of `@file-viewer/react`
- **THEN** the entry SHALL export `FileViewer` as the viewer component
- **AND** SHALL NOT export internal renderer functions or renderer-specific constants as public runtime API

#### Scenario: Consumer imports MarkdownChromeApi from package entry

- **WHEN** a consumer writes `import type { MarkdownChromeApi } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type from the package entry
