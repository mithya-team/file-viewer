## MODIFIED Requirements

### Requirement: Built package carries required runtime-owned assets

The built package SHALL include or correctly reference every runtime-owned artifact needed by supported renderers, including worker-backed behavior, PDFium WASM, and required vendor styles, so consumers do not manually copy package-owned assets into app `public` directories or permit an external CDN.

#### Scenario: Worker-backed renderer runs from built package

- **WHEN** a consumer renders a supported file type that uses a package-owned worker
- **THEN** the renderer SHALL resolve its runtime-owned assets from the installed package without manual asset copying

#### Scenario: PDF worker and WASM are available from package artifact

- **WHEN** a consumer uses PDF rendering from the built `@file-viewer/react` artifact
- **THEN** the PDF worker and PDFium WASM SHALL be emitted or resolved from the installed package through the package build pipeline
- **THEN** PDF rendering SHALL not rely on workspace-source bundling behavior, post-build JS rewriting, or a public CDN

#### Scenario: CSV required styles are carried by the package

- **WHEN** a consumer imports the documented package style entry and renders a CSV source
- **THEN** the installed artifact SHALL make the grid's required styles available without the consumer copying a vendor stylesheet

### Requirement: Built package declaration entry exports public types

The built package's `dist/index.d.ts` SHALL declare all types listed in the `public-type-exports` capability from the package entry, and package verification SHALL fail if any listed type is missing from that declaration file or if required PDF worker/WASM assets are absent from the distributable artifact.

#### Scenario: Verify-dist checks declaration exports and PDF assets

- **WHEN** `pnpm run verify-dist` runs after a successful build
- **THEN** the script SHALL validate that `dist/index.d.ts` exports every documented public type name
- **THEN** it SHALL require the bundled PDF worker and PDFium WASM asset
