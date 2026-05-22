## Why

`@file-viewer/react` emits many useful TypeScript types in `dist/*.d.ts`, but only a subset is re-exported from the package entry. Consumers building custom chrome, wrappers, or tooling must duplicate types or rely on fragile deep imports. Exporting the full type surface makes the public API discoverable and type-safe without exporting renderer implementations.

## What Changes

- Expand `packages/file-viewer/src/index.ts` to re-export all intended public types from a single entry (`@file-viewer/react`).
- Export core domain types: `FileKind`, `DetectionResult`, and per-format chrome API types (`ImageChromeApi`, `PDFChromeApi`, etc.).
- Export source-classification type: `StringSourceKind`.
- Export renderer prop types (`PdfRendererProps` and equivalent interfaces for other renderers after making them exported interfaces).
- Export PDF search types: `PdfSearchMatch`, `PdfSearchState`.
- Keep renderer **components**, constants, Tailwind class strings, and internal helpers **unexported** at the package entry (invariant: no public renderer registration or direct renderer use).
- Update `docs/invariants.md` and `AGENTS.md` to document type-only exports as allowed while renderer components remain internal.
- Update package README with a types reference section listing exported types.
- Add a build verification step that the published `index.d.ts` exports match the documented public type list.

## Capabilities

### New Capabilities

- `public-type-exports`: Package entry SHALL export the full documented TypeScript type surface for consumers; renderer components and runtime internals remain internal.

### Modified Capabilities

- `package-distribution`: Extend requirements so the built artifact's declaration entrypoint exports the documented public types and consumer docs list them.

## Impact

- `packages/file-viewer/src/index.ts`
- `packages/file-viewer/src/types.ts` (if consolidating exports)
- Renderer files with props interfaces (`PdfRenderer.tsx`, `ImageRenderer.tsx`, `SpreadsheetRenderer.tsx`, `DocxRenderer.tsx`, `TextRenderer.tsx`)
- `packages/file-viewer/src/source/classifyStringSource.ts`
- `packages/file-viewer/src/renderers/pdf/pdfSearchTypes.ts`
- `packages/file-viewer/README.md`
- `docs/invariants.md`, `AGENTS.md`
- Optional: `packages/file-viewer/scripts/verify-dist.mjs`
