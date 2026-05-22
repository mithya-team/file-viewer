## Context

`@file-viewer/react` builds `dist/index.d.ts` via `tsc -p tsconfig.build.json`. Today `src/index.ts` re-exports only five types from `./types`, while `dist/types.d.ts` already declares additional types (`FileKind`, chrome variants, etc.) that are not reachable through the package entry. Renderer prop interfaces are mostly file-private; only `PdfRendererProps` is exported from its module but not from the package root.

Project invariant: "Must not export individual renderers as public API in v1." That applies to **runtime components**, not TypeScript types used for chrome wrappers or advanced integration.

## Goals / Non-Goals

**Goals:**

- Single import path: `import type { … } from "@file-viewer/react"` covers all documented public types.
- Export domain, chrome, source, renderer-props, and PDF-search types listed in the proposal.
- Preserve tree-shaking: type-only re-exports (`export type { … }`) with no new runtime exports.
- Document the type surface in README; verify in `verify-dist`.

**Non-Goals:**

- Exporting renderer components (`PdfRenderer`, `ImageRenderer`, etc.).
- Exporting Tailwind class constants, PDF layout helpers, or search highlight utilities.
- Custom renderer registration or new props on `FileViewer`.
- Subpath export maps (e.g. `@file-viewer/react/types`) — entrypoint-only for v1.

## Decisions

### 1. Barrel through `src/index.ts` only

**Choice:** Add explicit `export type { … }` blocks in `index.ts`, grouped by source module.

**Rationale:** Matches current pattern; `tsc` emits one `index.d.ts` consumers resolve via `package.json` `exports["."].types`.

**Alternative:** `export * from "./types"` — rejected; would not include renderer/source modules and is harder to keep intentional.

### 2. Promote private renderer props to exported interfaces

**Choice:** Change `interface XRendererProps` to `export interface XRendererProps` in each renderer file, then re-export from `index.ts`.

**Rationale:** Types must be declared `export` in source for stable public API; matches existing `PdfRendererProps`.

**Alternative:** Central `renderer-types.ts` — rejected; duplicates fields and drifts from implementations.

### 3. Do not export `ChromeFileBase`

**Choice:** Keep `ChromeFileBase` as an internal helper type in `types.ts` (non-exported or unexported from index).

**Rationale:** Consumers use concrete `*ChromeApi` types; exporting the generic base adds noise.

### 4. Update invariants wording

**Choice:** Clarify Public API invariant: renderer **components** remain internal; **types** for chrome, detection, and renderer props may be exported for TypeScript consumers.

**Rationale:** Aligns docs with user intent without enabling renderer swapping in v1.

### 5. Dist verification

**Choice:** Extend `verify-dist.mjs` to assert `index.d.ts` contains a fixed list of exported type names (regex or parse).

**Rationale:** Prevents accidental removal from the barrel on refactor.

## Risks / Trade-offs

**[Larger public API surface]** → Mitigate with README grouping (core vs advanced); no runtime exports added.

**[Renderer props imply supported direct use]** → Document types as informational for wrappers/tests; components stay unexported.

**[Invariant/doc drift]** → Update `docs/invariants.md` and `AGENTS.md` in same change.

## Migration Plan

1. Implement source + `index.ts` exports; rebuild package.
2. Consumers on current imports unchanged (additive only).
3. No version bump required for types-only addition; note in changelog/README.

Rollback: revert `index.ts` and export keywords on interfaces.

## Open Questions

None blocking — full type list is defined in `specs/public-type-exports/spec.md`.
