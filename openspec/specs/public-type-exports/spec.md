# Public Type Exports Specification

## Purpose

`@file-viewer/react` SHALL expose a documented TypeScript type surface from its package entry so consumers can type custom chrome, wrappers, and tooling without deep-importing build artifacts or source paths.

## Requirements

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

#### Scenario: Consumer imports MarkdownChromeApi from package entry

- **WHEN** a consumer writes `import type { MarkdownChromeApi } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type from the package entry

#### Scenario: Consumer imports HtmlChromeApi from package entry

- **WHEN** a consumer writes `import type { HtmlChromeApi } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type from the package entry

#### Scenario: Consumer imports HtmlRendererProps from package entry

- **WHEN** a consumer writes `import type { HtmlRendererProps } from "@file-viewer/react"`
- **THEN** TypeScript SHALL resolve the type from the package entry
- **AND** `HtmlRenderer` SHALL NOT be a public runtime export

### Requirement: Internal implementation types stay off the public entry

Types and values used only for PDF layout, search highlighting, Tailwind class composition, and renderer internals SHALL NOT be re-exported from `@file-viewer/react`, including but not limited to: `ChromeFileBase`, `RENDERER_VIEWPORT_CLASS`, `PDF_CANVAS_CLASS`, and PDF search helper functions.

#### Scenario: Consumer cannot import internal Tailwind constants from package entry

- **WHEN** a consumer attempts `import { PDF_CANVAS_CLASS } from "@file-viewer/react"`
- **THEN** TypeScript SHALL report that the export does not exist

### Requirement: ImageChromeApi documents zoom and page controls

`ImageChromeApi` SHALL include an `image` object when `file.kind` is `"image"`, with the following members for TypeScript consumers:

- `zoom: number` — current zoom percentage
- `zoomIn: () => void` — toolbar step (+10, clamped 40–200)
- `zoomOut: () => void` — toolbar step (−10, clamped 40–200)
- `setZoom: (zoom: number) => void` — set clamped zoom
- `stepZoomIn: () => void` — sequential single-click step (+50 / +25 / +10 rules)
- `resetZoom: () => void` — reset to 100
- `page: number` — current 1-based page (meaningful for multi-page TIFF; `1` for other images)
- `pageCount: number` — total pages (`1` for non-TIFF images; IFD count for TIFF)
- `canPrev: boolean` — whether `prevPage` is allowed
- `canNext: boolean` — whether `nextPage` is allowed
- `prevPage: () => void` — go to previous page and scroll
- `nextPage: () => void` — go to next page and scroll
- `setPage: (page: number) => void` — set clamped page and scroll
- `subscribePageNavigate: (listener: (event: PageNavigateEvent) => void) => () => void` — programmatic navigate settle

#### Scenario: Consumer narrows image chrome API for zoom

- **WHEN** a consumer writes `function Chrome({ api }: { api: FileViewerChromeApi }) { if (api.file.kind !== "image") return null; api.image.zoomIn(); }`
- **THEN** TypeScript SHALL resolve `api.image.zoomIn` without error

#### Scenario: Consumer uses TIFF page navigation types

- **WHEN** a consumer writes `if (api.file.kind === "image" && api.image.pageCount > 1) api.image.setPage(2);`
- **THEN** TypeScript SHALL resolve `api.image.setPage` and `api.image.pageCount` without error

### Requirement: ImageRendererProps documents zoom inputs

`ImageRendererProps` (type-only export) SHALL document:

- `zoom: number`
- `onStepZoom: () => void`
- `onResetZoom: () => void`

alongside existing `objectUrl` and `onError` fields.

#### Scenario: Consumer imports ImageRendererProps

- **WHEN** a consumer writes `import type { ImageRendererProps } from "@file-viewer/react"`
- **THEN** TypeScript SHALL require `zoom`, `onStepZoom`, and `onResetZoom` when typing full props

### Requirement: PptxChromeApi exported from package entry

`@file-viewer/react` SHALL re-export `PptxChromeApi` from its primary entrypoint. When `api.file.kind` is `"pptx"`, `FileViewerChromeApi` SHALL narrow to `PptxChromeApi` with:

- `file: { kind: "pptx"; mimeType: string; downloadUrl: string | null }`
- `pptx: { page, pageCount, zoom, canPrev, canNext, prevPage, nextPage, setPage, subscribePageNavigate, zoomIn, zoomOut, setZoom }`

#### Scenario: Consumer narrows pptx chrome API

- **WHEN** a consumer writes `if (api.file.kind === "pptx") api.pptx.setPage(2);`
- **THEN** TypeScript SHALL resolve `api.pptx.setPage` without error

### Requirement: PageNavigateEvent and subscribePageNavigate types

`@file-viewer/react` SHALL export type `PageNavigateEvent` with `page: number` and `reason: "programmatic"`. `PDFChromeApi.pdf`, `PptxChromeApi.pptx`, and `ImageChromeApi.image` SHALL include `subscribePageNavigate: (listener: (event: PageNavigateEvent) => void) => () => void`.

#### Scenario: Consumer types PDF settle subscription

- **WHEN** a consumer writes `if (api.file.kind === "pdf") { const unsub = api.pdf.subscribePageNavigate(() => {}); unsub(); }`
- **THEN** TypeScript SHALL resolve `subscribePageNavigate` and `PageNavigateEvent` without error

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
