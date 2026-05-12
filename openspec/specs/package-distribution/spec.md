# Package Distribution Specification

## Purpose

`@file-viewer/react` package distribution SHALL define the built artifact contract required for consumer installation and use outside the workspace.

## Requirements

### Requirement: Built package exposes an installable consumer artifact

`@file-viewer/react` SHALL build into a consumer-installable artifact that can be used outside the workspace, including GitHub-based installation flows, without requiring consumers to import package source files directly, rely on committed build output, or resolve unused git-sourced Mithya dev dependencies.

#### Scenario: Consumer resolves package entrypoint

- **WHEN** a consumer installs `@file-viewer/react` from the built package artifact
- **THEN** importing `@file-viewer/react` SHALL resolve through package metadata to built JavaScript and type declaration entrypoints

#### Scenario: Build emits runtime JS and declarations through intended pipelines

- **WHEN** the package build runs
- **THEN** runtime JavaScript and runtime-owned assets SHALL be emitted by the package bundling pipeline, and TypeScript declarations SHALL be emitted for the same public entrypoints

#### Scenario: Package does not depend on workspace-only source paths

- **WHEN** the package is consumed outside this monorepo
- **THEN** runtime behavior SHALL not require direct references to `packages/file-viewer/src` or other workspace-only paths

#### Scenario: Git-based install avoids unused Mithya tooling dependency

- **WHEN** a consumer installs `@file-viewer/react` from a git-based source
- **THEN** the package install path SHALL not require fetching `@mithya/ui-registry` or `mithya-team/ui-repository` unless the package build actually uses that tooling

#### Scenario: Git-based install builds missing package artifacts

- **WHEN** a consumer installs `@file-viewer/react` from a git-based source and built files are not committed in the repository
- **THEN** the package lifecycle SHALL build the artifact before consumers resolve package entrypoints
- **AND** the lifecycle path SHALL not require a workspace-only path or a consumer-global `pnpm` binary

### Requirement: Built package carries required runtime-owned assets

The built package SHALL include or correctly reference every runtime-owned artifact needed by supported renderers, including worker-backed behavior, so consumers do not manually copy package-owned assets into app `public` directories.

#### Scenario: Worker-backed renderer runs from built package

- **WHEN** a consumer renders a supported file type that uses a package-owned worker
- **THEN** the renderer SHALL resolve its runtime-owned assets from the installed package without manual asset copying

#### Scenario: PDF worker is available from package artifact

- **WHEN** a consumer uses PDF rendering from the built `@file-viewer/react` artifact
- **THEN** the PDF worker SHALL be emitted or resolved from the installed package artifact through the package build pipeline rather than relying on workspace-source bundling behavior or post-build JS rewriting

### Requirement: Consumer guidance matches the built package contract

The package documentation SHALL describe the supported install path, lifecycle-build expectation for git installs, peer/runtime dependency expectations, absence of unused Mithya install prerequisites, supported formats, host setup needed to use the built package artifact, key runtime caveats, and documented customization points consumers can rely on.

#### Scenario: Consumer follows install guidance

- **WHEN** a consumer follows the package README for install and host setup
- **THEN** the consumer SHALL have enough information to import `FileViewer`, satisfy peer dependencies, and configure Tailwind scanning for the installed package

#### Scenario: Git-based install guidance does not mention Mithya setup

- **WHEN** a consumer follows the documented GitHub install path
- **THEN** the documentation SHALL not require `@mithya/ui-registry`, `@mithya/ui-repository`, or other Mithya-specific setup unless the package explicitly adopts that tooling again

#### Scenario: Consumer installs from GitHub source

- **WHEN** a consumer follows the documented GitHub install path
- **THEN** the documentation SHALL not imply that committed `dist` output is required in the repository

#### Scenario: Consumer reaches first render from README

- **WHEN** a new consumer follows the primary usage example in the package README
- **THEN** the documentation SHALL cover install, import, a sized viewer container or parent height requirement, and Tailwind scanning needed for the installed package

#### Scenario: Consumer checks supported files and limits

- **WHEN** a consumer reads the package README to evaluate fit
- **THEN** the documentation SHALL identify the supported file families and major current limits that affect adoption decisions

#### Scenario: Consumer uses URL string sources

- **WHEN** a consumer reads how string URL sources behave
- **THEN** the documentation SHALL state that URL sources are loaded through normal browser fetch behavior and depend on reachable URLs and compatible CORS behavior

#### Scenario: Consumer reads runtime and customization contract

- **WHEN** a consumer reads the package README for integration details
- **THEN** the documentation SHALL describe the client/browser runtime expectation, fallback and error hooks, and the documented theming or chrome customization surface supported by the package
