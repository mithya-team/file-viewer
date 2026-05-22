## 1. Source type visibility

- [x] 1.1 Export `ImageRendererProps`, `SpreadsheetRendererProps`, `DocxRendererProps`, and `TextRendererProps` interfaces from their renderer modules (match existing `PdfRendererProps` pattern)
- [x] 1.2 Confirm `StringSourceKind`, `PdfSearchMatch`, and `PdfSearchState` remain exported from their defining modules

## 2. Package entry barrel

- [x] 2.1 Expand `packages/file-viewer/src/index.ts` with `export type` blocks for all types in `specs/public-type-exports/spec.md` (core, chrome, detection, source, renderer props, PDF search)
- [x] 2.2 Run `pnpm run build:artifact` in `packages/file-viewer` and confirm `dist/index.d.ts` lists every public type

## 3. Verification and docs

- [x] 3.1 Extend `packages/file-viewer/scripts/verify-dist.mjs` to assert required type names appear in `dist/index.d.ts`
- [x] 3.2 Add README "TypeScript exports" section grouping public types; note renderer components are not exported
- [x] 3.3 Update `docs/invariants.md` and `AGENTS.md` Public API bullets: types may be exported; renderer components stay internal

## 4. Validation

- [x] 4.1 Run `pnpm run verify-dist` and `pnpm exec tsc --noEmit` in `apps/demo`
- [x] 4.2 Optionally switch demo imports (e.g. `DemoViewerChrome`) to use newly exported types if any were workarounds
