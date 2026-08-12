## ADDED Requirements

### Requirement: Renderer runtime assets resolve without an external network

Supported renderer engines SHALL resolve every required worker, WASM binary, stylesheet, and supporting asset from the installed package artifact or the host application's already-loaded package assets. They SHALL NOT require a public CDN or a consumer-copied `public` asset as the default path.

#### Scenario: PDF opens while outbound network is denied

- **WHEN** a consumer renders a valid buffered PDF in a browser where outbound requests to external origins are denied
- **THEN** the PDF engine SHALL load its WASM and worker assets from the installed package artifact
- **THEN** the document SHALL render without a request to a public CDN

#### Scenario: Consumer does not copy renderer assets

- **WHEN** a consumer installs the built package without copying renderer files into its own `public` directory
- **THEN** PDF and other worker-backed renderer assets SHALL resolve through package-owned build output

### Requirement: Client-only renderer code preserves SSR-safe package import

Browser-only renderer modules SHALL be isolated behind a client-rendered loading boundary so importing `@file-viewer/react` during SSR does not evaluate browser-only globals or vendor grid code.

#### Scenario: Server imports package entry

- **WHEN** an SSR environment imports `@file-viewer/react`
- **THEN** the import SHALL complete without accessing `window`, `document`, workers, or Glide Data Grid at module evaluation time

#### Scenario: CSV mounts in a browser

- **WHEN** a browser renders a CSV source after FileViewer has classified and buffered it
- **THEN** the CSV client renderer and its required vendor styles SHALL load before the interactive grid is presented

