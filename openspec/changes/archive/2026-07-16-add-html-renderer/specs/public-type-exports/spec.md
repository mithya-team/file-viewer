## ADDED Requirements

### Requirement: Package entry exports HtmlChromeApi

`@file-viewer/react` SHALL re-export type `HtmlChromeApi` from its primary entrypoint using a type-only export so it appears in `dist/index.d.ts`.

#### Scenario: Consumer imports HtmlChromeApi from package entry

- **WHEN** a consumer writes `import type { HtmlChromeApi } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type from the package entry

### Requirement: Package entry exports HtmlRendererProps

`@file-viewer/react` SHALL re-export type `HtmlRendererProps` from its primary entrypoint using a type-only export. The `HtmlRenderer` component MUST NOT be a public runtime export.

#### Scenario: Consumer imports HtmlRendererProps without the component

- **WHEN** a consumer writes `import type { HtmlRendererProps } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type
- **AND** importing `HtmlRenderer` from `@file-viewer/react` SHALL NOT be part of the public API

### Requirement: FileKind and DetectionResult include html

`FileKind` and `DetectionResult` SHALL include the `"html"` variant so consumers typing detection or chrome switches can handle HTML.

#### Scenario: Consumer narrows on html kind

- **WHEN** a consumer writes a type guard or switch on `DetectionResult` / `FileKind` including `"html"`
- **THEN** TypeScript SHALL accept `"html"` as a valid kind discriminant

### Requirement: FileViewerProps includes enableHtmlPreview

`FileViewerProps` SHALL include optional `enableHtmlPreview?: boolean` (documented default `false`) on the public props type exported from the package entry.

#### Scenario: Consumer types enableHtmlPreview

- **WHEN** a consumer writes `<FileViewer source={src} enableHtmlPreview />` with types from `@file-viewer/react`
- **THEN** TypeScript SHALL accept `enableHtmlPreview` on `FileViewerProps`

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
- `HtmlChromeApi`
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
- `HtmlRendererProps`

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

#### Scenario: Consumer imports HtmlChromeApi from package entry

- **WHEN** a consumer writes `import type { HtmlChromeApi } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type from the package entry

#### Scenario: Consumer imports HtmlRendererProps from package entry

- **WHEN** a consumer writes `import type { HtmlRendererProps } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type from the package entry
- **AND** `HtmlRenderer` SHALL NOT be a public runtime export
