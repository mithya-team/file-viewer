# Package Distribution Specification

## Purpose

`@file-viewer/react` package distribution SHALL define the built artifact contract required for consumer installation and use outside the workspace.

## Requirements

### Requirement: Built package exposes an installable consumer artifact

`@file-viewer/react` SHALL build into a consumer-installable artifact that can be used outside the workspace, including GitHub-based installation flows, without requiring consumers to import package source files directly.

#### Scenario: Consumer resolves package entrypoint

- **WHEN** a consumer installs `@file-viewer/react` from the built package artifact
- **THEN** importing `@file-viewer/react` SHALL resolve through package metadata to built JavaScript and type declaration entrypoints

#### Scenario: Build emits runtime JS and declarations through intended pipelines

- **WHEN** the package build runs
- **THEN** runtime JavaScript and runtime-owned assets SHALL be emitted by the package bundling pipeline, and TypeScript declarations SHALL be emitted for the same public entrypoints

#### Scenario: Package does not depend on workspace-only source paths

- **WHEN** the package is consumed outside this monorepo
- **THEN** runtime behavior SHALL not require direct references to `packages/file-viewer/src` or other workspace-only paths

### Requirement: Built package carries required runtime-owned assets

The built package SHALL include or correctly reference every runtime-owned artifact needed by supported renderers, including worker-backed behavior, so consumers do not manually copy package-owned assets into app `public` directories.

#### Scenario: Worker-backed renderer runs from built package

- **WHEN** a consumer renders a supported file type that uses a package-owned worker
- **THEN** the renderer SHALL resolve its runtime-owned assets from the installed package without manual asset copying

#### Scenario: PDF worker is available from package artifact

- **WHEN** a consumer uses PDF rendering from the built `@file-viewer/react` artifact
- **THEN** the PDF worker SHALL be emitted or resolved from the installed package artifact through the package build pipeline rather than relying on workspace-source bundling behavior or post-build JS rewriting

### Requirement: Consumer guidance matches the built package contract

The package documentation SHALL describe the supported install path, peer/runtime dependency expectations, and host setup needed to use the built package artifact.

#### Scenario: Consumer follows install guidance

- **WHEN** a consumer follows the package README for install and host setup
- **THEN** the consumer SHALL have enough information to import `FileViewer`, satisfy peer dependencies, and configure Tailwind scanning for the installed package
