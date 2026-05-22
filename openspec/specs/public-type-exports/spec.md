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
- `UnsupportedChromeApi`

**Source classification**

- `StringSourceKind`

**Renderer props (types only; components not exported)**

- `PdfRendererProps`
- `ImageRendererProps`
- `SpreadsheetRendererProps`
- `DocxRendererProps`
- `TextRendererProps`

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

### Requirement: Internal implementation types stay off the public entry

Types and values used only for PDF layout, search highlighting, Tailwind class composition, and renderer internals SHALL NOT be re-exported from `@file-viewer/react`, including but not limited to: `ChromeFileBase`, `RENDERER_VIEWPORT_CLASS`, `PDF_CANVAS_CLASS`, and PDF search helper functions.

#### Scenario: Consumer cannot import internal Tailwind constants from package entry

- **WHEN** a consumer attempts `import { PDF_CANVAS_CLASS } from "@file-viewer/react"`
- **THEN** TypeScript SHALL report that the export does not exist
