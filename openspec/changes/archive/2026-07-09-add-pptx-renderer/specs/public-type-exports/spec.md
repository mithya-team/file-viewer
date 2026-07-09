## ADDED Requirements

### Requirement: PptxChromeApi exported from package entry

`@file-viewer/react` SHALL re-export `PptxChromeApi` from its primary entrypoint. When `api.file.kind` is `"pptx"`, `FileViewerChromeApi` SHALL narrow to `PptxChromeApi` with:

- `file: { kind: "pptx"; mimeType: string; downloadUrl: string | null }`
- `pptx: { page, pageCount, zoom, canPrev, canNext, prevPage, nextPage, setPage, zoomIn, zoomOut, setZoom }`

#### Scenario: Consumer narrows pptx chrome API

- **WHEN** a consumer writes `if (api.file.kind === "pptx") api.pptx.setPage(2);`
- **THEN** TypeScript SHALL resolve `api.pptx.setPage` without error

### Requirement: PptxRendererProps type-only export

`PptxRendererProps` SHALL be exported as a type-only export documenting `blob`, `page`, `zoom`, `onError`, `onPageCountChange`, and optional `onVisiblePageChange`. The `PptxRenderer` component SHALL NOT be exported.

#### Scenario: Consumer imports PptxRendererProps

- **WHEN** a consumer writes `import type { PptxRendererProps } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type
- **AND** `PptxRenderer` SHALL NOT be importable from the package entry

### Requirement: FileKind includes pptx

`FileKind` and `DetectionResult` exported from the package entry SHALL include the `"pptx"` variant.

#### Scenario: Consumer handles pptx in FileKind switch

- **WHEN** a consumer switches on `DetectionResult["kind"]`
- **THEN** TypeScript SHALL require handling `"pptx"` for exhaustiveness

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
- `UnsupportedChromeApi`

**Source classification**

- `StringSourceKind`

**Renderer props (types only; components not exported)**

- `PdfRendererProps`
- `ImageRendererProps`
- `SpreadsheetRendererProps`
- `DocxRendererProps`
- `TextRendererProps`
- `PptxRendererProps`

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
